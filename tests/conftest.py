"""Shared pytest fixtures + a stub for kiro_crew.cron_script.

The cron modules under crons/ import `from kiro_crew.cron_script import Report, Skip`.
The real package is only present inside a live KiroCrew gateway, so for unit tests we
install a lightweight stub module into sys.modules BEFORE any cron is imported. The stub
mirrors the control-flow contract the crons rely on: Report/Skip/Done are exceptions the
runtime catches (Skip = retry/no-op, Report = deliver+keep, Done = deliver+remove).
"""

from __future__ import annotations

import sys
import types
from pathlib import Path

import pytest

# --- Make crons/ and scripts/ importable (mirrors pytest.ini pythonpath) ---------------
_REPO_ROOT = Path(__file__).resolve().parent.parent
for _sub in ("crons", "scripts"):
    _p = str(_REPO_ROOT / _sub)
    if _p not in sys.path:
        sys.path.insert(0, _p)


# --- Stub kiro_crew.cron_script (only if the real package is absent) --------------------
def _install_cron_script_stub() -> None:
    try:  # prefer the real module when running inside a gateway
        import kiro_crew.cron_script  # noqa: F401
        return
    except Exception:
        pass

    class Skip(Exception):
        """Retry / no-op this cycle."""

    class Report(Exception):
        """Deliver a message and keep the job running."""

        def __init__(self, message: str = "") -> None:
            super().__init__(message)
            self.message = message

    class Done(Exception):
        """Deliver a message and remove the job."""

        def __init__(self, message: str = "") -> None:
            super().__init__(message)
            self.message = message

    pkg = sys.modules.get("kiro_crew")
    if pkg is None:
        pkg = types.ModuleType("kiro_crew")
        pkg.__path__ = []  # mark as a package
        sys.modules["kiro_crew"] = pkg

    mod = types.ModuleType("kiro_crew.cron_script")
    mod.Skip = Skip
    mod.Report = Report
    mod.Done = Done
    sys.modules["kiro_crew.cron_script"] = mod
    pkg.cron_script = mod


_install_cron_script_stub()


@pytest.fixture()
def repo_root() -> Path:
    return _REPO_ROOT


@pytest.fixture()
def mock_ctx():
    """A mock cron ctx with call_tool + notify as MagicMocks (stdlib, no pytest-mock dep)."""
    from unittest import mock

    ctx = mock.MagicMock(name="ctx")
    ctx.call_tool = mock.MagicMock(name="call_tool")
    ctx.notify = mock.MagicMock(name="notify")
    return ctx


# --------------------------------------------------------------------------- #
# advance-cron fixtures (added for tests/test_advance.py)
# --------------------------------------------------------------------------- #
import importlib  # noqa: E402


@pytest.fixture()
def advance_mod(monkeypatch, tmp_path):
    """Import the advance cron with DLC_YOLO_STATE pointed at a tmp file.

    Reloads the module so its module-level STATE global re-resolves to the tmp path, and
    patches subprocess.run to a no-op success so no real gh/label calls run.
    """
    state_file = tmp_path / "state.json"
    monkeypatch.setenv("DLC_YOLO_STATE", str(state_file))

    sys.modules.pop("dlc_yolo_advance", None)
    mod = importlib.import_module("dlc_yolo_advance")
    importlib.reload(mod)
    mod.STATE = state_file  # force, regardless of import ordering

    class _FakeCompleted:
        def __init__(self):
            self.returncode = 0
            self.stdout = "{}"
            self.stderr = ""

    monkeypatch.setattr(mod.subprocess, "run", lambda *a, **k: _FakeCompleted())
    return mod


@pytest.fixture()
def state_path(advance_mod):
    return advance_mod.STATE


@pytest.fixture()
def card_factory():
    _counter = {"n": 0}

    def _make(**overrides):
        _counter["n"] += 1
        n = _counter["n"]
        card = {
            "id": f"card-{n}",
            "title": f"Card {n}",
            "pipeline_id": "pl-1",
            "stage": "requirements",
            "sot": "local",  # local -> ownership guard passes without gh
            "source": {"type": "github", "repo": "owner/repo", "issue": 100 + n},
            "step_status": {},
        }
        card.update(overrides)
        return card

    return _make


@pytest.fixture()
def state_factory():
    def _make(cards=None, pipelines=None, config=None):
        if pipelines is None:
            pipelines = [{
                "id": "pl-1", "repo": "owner/repo", "workspace": "default",
                "trust": "assisted", "depth": "standard", "steps": [],
            }]
        return {
            "config": config or {"trust": "assisted", "depth": "standard"},
            "pipelines": pipelines,
            "cards": cards or [],
        }

    return _make


@pytest.fixture()
def write_state(state_path):
    import json

    def _write(state: dict):
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")

    return _write


@pytest.fixture()
def read_state(state_path):
    import json

    def _read() -> dict:
        return json.loads(Path(state_path).read_text(encoding="utf-8"))

    return _read
