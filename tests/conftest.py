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


# --------------------------------------------------------------------------- #
# STATE-CORRUPTION GUARD (autouse, session + function scope)                    #
#                                                                               #
# The advance cron resolves its STATE path from DLC_YOLO_STATE at IMPORT time   #
# and _save() writes to it. If a test imports the module without this env set,  #
# STATE resolves to the REAL ~/.dlc-yolo/state.json and a save CLOBBERS live    #
# state (this actually happened: a suite run overwrote the real pipeline+cards  #
# with a test fixture). These guards make that structurally impossible.         #
# --------------------------------------------------------------------------- #
import os as _os  # noqa: E402

_REAL_DLC_HOME = Path(_os.path.expanduser("~/.dlc-yolo")).resolve()


@pytest.fixture(scope="session", autouse=True)
def _guard_state_path(tmp_path_factory):
    """Redirect DLC_YOLO_STATE + HOME to session tmp dirs so NO test can ever
    resolve or write the real ~/.dlc-yolo/state.json. Fail closed otherwise.

    CRITICAL: some test modules do a TOP-LEVEL ``import dlc_yolo_advance`` at
    collection time — BEFORE this session fixture runs — so the module's STATE /
    STATE_POINTER globals are already baked to the REAL path. Setting env alone is
    too late for them. So we also FORCE those globals on any already-imported copy
    (and reload it) to point at the session tmp dir."""
    session_home = tmp_path_factory.mktemp("dlc_home")
    session_state_dir = tmp_path_factory.mktemp("dlc_state")
    session_state = session_state_dir / "state.json"
    prev = {k: _os.environ.get(k) for k in ("DLC_YOLO_STATE", "HOME")}
    _os.environ["DLC_YOLO_STATE"] = str(session_state)
    _os.environ["HOME"] = str(session_home)
    assert _REAL_DLC_HOME not in Path(str(session_home)).resolve().parents

    # Force any already-imported advance module off the real path.
    mod = sys.modules.get("dlc_yolo_advance")
    if mod is not None:
        try:
            import importlib
            importlib.reload(mod)
        except Exception:
            pass
        try:
            mod.STATE = session_state
            mod.STATE_POINTER = session_home / ".dlc-yolo" / ".statepath"
            mod.STATE_IS_EXPLICIT = True
        except Exception:
            pass
    yield
    for k, v in prev.items():
        if v is None:
            _os.environ.pop(k, None)
        else:
            _os.environ[k] = v


@pytest.fixture(autouse=True)
def _fence_real_state_writes(_guard_state_path):
    """ACTIVE per-test fence (reload-proof): before each test, wrap the advance
    module's _save so ANY attempt to persist under the real ~/.dlc-yolo raises
    before bytes hit disk. Per-test (function) scope so it re-wraps after a test's
    own importlib.reload (which would otherwise restore the unpatched _save). This
    is the last line of defense; the env redirect handles the normal path."""
    import importlib
    mod = sys.modules.get("dlc_yolo_advance")
    if mod is None:
        try:
            mod = importlib.import_module("dlc_yolo_advance")
        except Exception:
            yield
            return

    _real_save = getattr(mod, "_save", None)
    if _real_save is None or getattr(_real_save, "_dlc_fenced", False):
        yield
        return

    def _under_real(path_attr: str) -> bool:
        target = Path(str(getattr(mod, path_attr, ""))).resolve()
        return target == _REAL_DLC_HOME / "state.json" or _REAL_DLC_HOME in target.parents

    _real_bootstrap = getattr(mod, "_bootstrap", None)
    _real_publish = getattr(mod, "_publish_state_pointer", None)

    def _fenced_save(state, *a, **k):
        if _under_real("STATE"):
            raise AssertionError(
                f"TEST SAFETY: refused _save() to REAL state {Path(str(mod.STATE)).resolve()}.")
        return _real_save(state, *a, **k)

    def _fenced_bootstrap(*a, **k):
        if _under_real("STATE"):
            raise AssertionError(
                f"TEST SAFETY: refused _bootstrap() seeding REAL state {Path(str(mod.STATE)).resolve()}.")
        return _real_bootstrap(*a, **k) if _real_bootstrap else None

    def _fenced_publish(*a, **k):
        # STATE_POINTER lives under the real ~/.dlc-yolo too; refuse a real write.
        ptr = Path(str(getattr(mod, "STATE_POINTER", ""))).resolve()
        if ptr == _REAL_DLC_HOME / ".statepath" or _REAL_DLC_HOME in ptr.parents:
            return False  # publish is best-effort; refusing is a valid no-op
        return _real_publish(*a, **k) if _real_publish else False

    _fenced_save._dlc_fenced = True
    mod._save = _fenced_save
    if _real_bootstrap is not None:
        mod._bootstrap = _fenced_bootstrap
    if _real_publish is not None:
        mod._publish_state_pointer = _fenced_publish
    yield
    mod._save = _real_save
    if _real_bootstrap is not None:
        mod._bootstrap = _real_bootstrap
    if _real_publish is not None:
        mod._publish_state_pointer = _real_publish


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
    mod.STATE_POINTER = tmp_path / "home" / ".dlc-yolo" / ".statepath"
    mod.STATE_IS_EXPLICIT = True

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
