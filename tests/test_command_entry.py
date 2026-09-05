"""Command-entry and fresh-session slash-discovery contracts for DLC-YOLO."""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path

import pytest

_REPO = Path(__file__).resolve().parent.parent
_SKILL = _REPO / "skills" / "dlc-yolo" / "SKILL.md"
_README = _REPO / "README.md"
_SETUP = _REPO / "scripts" / "setup-crons.py"


def _setup_module():
    spec = importlib.util.spec_from_file_location("dlc_yolo_setup_crons", _SETUP)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _skill_dir(root: Path, name: str = "dlc-yolo") -> Path:
    path = root / name
    path.mkdir(parents=True)
    (path / "SKILL.md").write_text(
        "---\nname: dlc-yolo\ndescription: test\n---\n", encoding="utf-8"
    )
    return path


def test_skill_routes_config_before_normal_intent_or_mode_work():
    text = _SKILL.read_text(encoding="utf-8")
    dispatch = text.index("Parse the trimmed `$ARGUMENTS`")
    on_invoke = text.index("## On invoke (after command dispatch)")

    assert dispatch < on_invoke
    assert "`config [<repo>]`" in text
    assert "configuration-only mode" in text
    assert "Do not capture intent, create an issue/card, move a stage" in text
    assert "continue to **maintain** (§2) without forcing setup to reopen" in text


def test_fresh_pipeline_form_accepts_all_documented_defaults():
    text = _SKILL.read_text(encoding="utf-8")

    assert "this is a FRESH pipeline" in text
    assert "configuration form is the first interaction" in text
    assert "one `ask_question` card" in text
    assert "`defaults`" in text
    for expected in (
        "assisted (default)",
        "standard (default)",
        "follow depth (default)",
        "results-in-repo OFF",
        "backlog auto-intake ON",
        "self-enabling OFF",
        "approach simplified",
    ):
        assert expected in text


def test_install_docs_use_reconciler_not_manual_global_symlinks():
    text = _README.read_text(encoding="utf-8")

    assert "publish /dlc-yolo" in text
    assert "~/.kiro/skills/dlc-yolo" not in text or "ln -s" not in text
    assert "Open a FRESH Kiro session" in text
    assert "dashboard `/` picker is currently" in text
    assert "requires a KiroCrew core change" in text
    assert "ln -s ~/.kiro/crew/apps/dlc-yolo" not in text


def test_slash_skill_check_reports_missing_link_without_mutation(tmp_path: Path):
    module = _setup_module()
    source = _skill_dir(tmp_path / "app")
    link = tmp_path / "home" / ".kiro" / "skills" / "dlc-yolo"

    drift, blocked = module.reconcile_slash_skill(
        True, link=link, sources=(source,)
    )

    assert drift is True
    assert blocked is False
    assert not os.path.lexists(link)


def test_slash_skill_publication_is_idempotent(tmp_path: Path):
    module = _setup_module()
    source = _skill_dir(tmp_path / "app")
    link = tmp_path / "home" / ".kiro" / "skills" / "dlc-yolo"

    first = module.reconcile_slash_skill(False, link=link, sources=(source,))
    second = module.reconcile_slash_skill(False, link=link, sources=(source,))

    assert first == (True, False)
    assert second == (False, False)
    assert link.is_symlink()
    assert link.resolve() == source.resolve()


def test_slash_skill_repair_only_repoints_known_dlc_yolo_link(tmp_path: Path):
    module = _setup_module()
    preferred = _skill_dir(tmp_path / "deployed")
    old_owned = _skill_dir(tmp_path / "checkout")
    link = tmp_path / "home" / ".kiro" / "skills" / "dlc-yolo"
    link.parent.mkdir(parents=True)
    link.symlink_to(old_owned, target_is_directory=True)

    result = module.reconcile_slash_skill(
        False, link=link, sources=(preferred, old_owned)
    )

    assert result == (True, False)
    assert link.resolve() == preferred.resolve()


@pytest.mark.parametrize("kind", ["directory", "file", "foreign-symlink"])
def test_slash_skill_never_overwrites_user_or_foreign_path(tmp_path: Path, kind: str):
    module = _setup_module()
    source = _skill_dir(tmp_path / "app")
    link = tmp_path / "home" / ".kiro" / "skills" / "dlc-yolo"
    link.parent.mkdir(parents=True)

    if kind == "directory":
        link.mkdir()
        marker = link / "keep.txt"
        marker.write_text("user-owned", encoding="utf-8")
    elif kind == "file":
        link.write_text("user-owned", encoding="utf-8")
        marker = link
    else:
        foreign = _skill_dir(tmp_path / "foreign", name="other")
        link.symlink_to(foreign, target_is_directory=True)
        marker = foreign / "SKILL.md"

    before = marker.read_bytes() if marker.is_file() else b""
    result = module.reconcile_slash_skill(False, link=link, sources=(source,))

    assert result == (True, True)
    assert os.path.lexists(link)
    if marker.is_file():
        assert marker.read_bytes() == before
    if kind == "foreign-symlink":
        assert link.resolve() == foreign.resolve()


def test_new_card_captures_raw_intent_without_console_normalization():
    text = _SKILL.read_text(encoding="utf-8")
    assert "raw_intent:{ text:\"<exact original user message>\"" in text
    assert "`raw_intent` is immutable evidence" in text
    assert "fabricate a source reference" in text
    assert "intent-agent writes the separate versioned" in text
    assert "console must not infer outcomes, enforcement, quality, research" in text


def test_setup_captures_repo_path_without_inference_or_extra_question():
    text = _SKILL.read_text(encoding="utf-8")
    normalized = " ".join(text.split())

    assert "pipeline.repo_path" in text
    assert "exact `dir` of a selected KiroCrew workspace" in normalized
    assert "Do not infer a filesystem path" in text
    assert "leave it unset" in text
    assert "mutable builder/repo-mirror steps will block safely" in text
    assert "does not justify an extra solution/scope question" in text
