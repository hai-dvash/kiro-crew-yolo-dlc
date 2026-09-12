"""Priority 7 app-owned advance cron identity reconciliation."""

from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path

import pytest


@pytest.fixture()
def setup_mod(repo_root):
    path = repo_root / "scripts" / "setup-crons.py"
    spec = importlib.util.spec_from_file_location("dlc_yolo_setup_priority7", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_advance_job_identity_matches_runtime_seed(setup_mod, advance_mod):
    assert setup_mod._job_id(setup_mod.ADVANCE_NAME) == advance_mod._advance_job_id()
    assert len(advance_mod._advance_job_id()) == 12


def test_backlog_job_honors_pipeline_opt_out_in_manifest_and_fallback(
        setup_mod, monkeypatch, tmp_path: Path):
    required = (
        "Read state.pipelines",
        "backlog_intake is not false",
        "Do not infer repository eligibility from cards alone",
        "FIRST apply the OWNERSHIP GUARD",
    )
    source_manifest = json.loads((setup_mod.REPO / "app.json").read_text(encoding="utf-8"))
    source_app_crons = tmp_path / "source-app-crons.json"
    source_app_crons.write_text(json.dumps(source_manifest["crons"]), encoding="utf-8")
    monkeypatch.setattr(setup_mod, "APP_CRONS", source_app_crons)
    declared = next(job for job in setup_mod._desired_jobs()
                    if job["name"] == setup_mod.BACKLOG_NAME)
    for text in required:
        assert text in declared["message"]
    assert "Collect the distinct owned repos from state.json cards' source.repo" not in declared["message"]

    monkeypatch.setattr(setup_mod, "APP_CRONS", tmp_path / "missing-app-crons.json")
    fallback = next(job for job in setup_mod._desired_jobs()
                    if job["name"] == setup_mod.BACKLOG_NAME)
    for text in required:
        assert text in fallback["message"]


def test_reconcile_converges_valid_random_advance_id_and_preserves_foreign_job(
        setup_mod, monkeypatch, tmp_path: Path):
    crons_json = tmp_path / "crons.json"
    desired = setup_mod._job_template(setup_mod.ADVANCE_NAME)
    desired["script"] = "~/.kiro/crew/crons/dlc_yolo_advance.py:advance"
    current = copy.deepcopy(desired)
    current["name"] = f"dlc-yolo/{setup_mod.ADVANCE_NAME}"
    current["id"] = "abcdef123456"  # format-valid, but not the app-owned identity
    foreign = {"id": "fedcba654321", "name": "another-app-job", "enabled": True}
    original = {"version": 2, "jobs": [current, foreign]}
    crons_json.write_text(json.dumps(original), encoding="utf-8")

    monkeypatch.setattr(setup_mod, "CRONS_JSON", crons_json)
    monkeypatch.setattr(setup_mod, "_desired_jobs", lambda: [copy.deepcopy(desired)])

    assert setup_mod.reconcile_crons(check=True) is True
    assert json.loads(crons_json.read_text(encoding="utf-8")) == original

    assert setup_mod.reconcile_crons(check=False) is True
    repaired = json.loads(crons_json.read_text(encoding="utf-8"))
    by_name = {item["name"]: item for item in repaired["jobs"]}
    assert by_name[current["name"]]["id"] == setup_mod._job_id(setup_mod.ADVANCE_NAME)
    assert by_name[foreign["name"]] == foreign
    assert crons_json.with_suffix(".json.bak").exists()

    assert setup_mod.reconcile_crons(check=False) is False


def test_reconcile_refuses_foreign_advance_id_collision(
        setup_mod, monkeypatch, tmp_path: Path):
    crons_json = tmp_path / "crons.json"
    desired = setup_mod._job_template(setup_mod.ADVANCE_NAME)
    desired["script"] = "~/.kiro/crew/crons/dlc_yolo_advance.py:advance"
    current = copy.deepcopy(desired)
    current["id"] = "abcdef123456"
    foreign = {
        "id": desired["id"], "name": "foreign-owner", "enabled": True,
    }
    original = {"version": 2, "jobs": [current, foreign]}
    crons_json.write_text(json.dumps(original), encoding="utf-8")
    monkeypatch.setattr(setup_mod, "CRONS_JSON", crons_json)
    monkeypatch.setattr(setup_mod, "_desired_jobs", lambda: [copy.deepcopy(desired)])

    with pytest.raises(RuntimeError, match="already owned by foreign job"):
        setup_mod.reconcile_crons(check=False)

    assert json.loads(crons_json.read_text(encoding="utf-8")) == original
    assert not crons_json.with_suffix(".json.bak").exists()


def test_deploy_script_includes_secure_webhook_helper(
        setup_mod, monkeypatch, tmp_path: Path):
    source_dir = tmp_path / "source"
    runtime_dir = tmp_path / "runtime"
    source_dir.mkdir()
    sources = {
        "CRON_SRC": source_dir / "dlc_yolo_advance.py",
        "SPAWNS_SRC": source_dir / "dlc_yolo_spawns.py",
        "WEBHOOK_SRC": source_dir / "dlc_yolo_webhook.py",
        "PROJECTION_SRC": source_dir / "dlc_yolo_projection.py",
    }
    destinations = {
        "CRON_DST": runtime_dir / "dlc_yolo_advance.py",
        "SPAWNS_DST": runtime_dir / "dlc_yolo_spawns.py",
        "WEBHOOK_DST": runtime_dir / "dlc_yolo_webhook.py",
        "PROJECTION_DST": runtime_dir / "dlc_yolo_projection.py",
    }
    for index, (name, path) in enumerate(sources.items()):
        path.write_text(f"VALUE = {index}\n", encoding="utf-8")
        monkeypatch.setattr(setup_mod, name, path)
    for name, path in destinations.items():
        monkeypatch.setattr(setup_mod, name, path)

    assert setup_mod.deploy_script(check=True) is True
    assert not runtime_dir.exists()

    assert setup_mod.deploy_script(check=False) is True
    for source_name, destination_name in (
            ("CRON_SRC", "CRON_DST"), ("SPAWNS_SRC", "SPAWNS_DST"),
            ("WEBHOOK_SRC", "WEBHOOK_DST"),
            ("PROJECTION_SRC", "PROJECTION_DST")):
        source = getattr(setup_mod, source_name)
        destination = getattr(setup_mod, destination_name)
        assert destination.read_bytes() == source.read_bytes()
    assert setup_mod.deploy_script(check=False) is False
