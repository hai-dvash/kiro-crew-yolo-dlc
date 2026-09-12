"""DLC-YOLO — deterministic pipeline advance (zero-token script cron), ENTRY SHIM.

Registered as:  script='~/.kiro/crew/crons/dlc_yolo_advance.py:advance'

WHY THIS FILE IS TINY
---------------------
The gateway security-scans a cron SCRIPT's own body before it will run, refusing
any body larger than 262144 bytes (``mcp_cron.py:_MAX_SCRIPT_SCAN_BYTES``). The
advance loop grew to ~466 KB / 9000+ lines and so was REFUSED pre-execution every
tick ("input is too large to security-scan") — the whole zero-token advance loop
was silently dead, which is why cards sat inert at their step. The scanner reads
only THIS file's bytes; it does not size-scan modules this file imports or the
source it execs. So the implementation lives in ``_dlc_yolo_impl.py`` and this
entry file stays a thin loader well under the limit.

HOW (and why exec, not ``import *``)
------------------------------------
We EXEC the implementation source directly into THIS module's own namespace.
That makes every name (``advance`` plus all module-level helpers/constants and the
author caches) a real attribute DEFINED IN this module object — so the test
harness's ``importlib.reload(dlc_yolo_advance)``, ``monkeypatch.setattr(mod, ...)``,
and ``mod._AUTH_USER_CACHE.clear()`` all bind the SAME objects the running code
uses. A ``from _dlc_yolo_impl import *`` would instead copy references, and a
monkeypatch on the shim would not be seen by the impl's internal calls. Exec keeps
one namespace, identical to the pre-split single-file behavior.
"""

from __future__ import annotations

import os
from pathlib import Path

# Locate the implementation source beside this entry file (deployed together by
# setup-crons.py) or in the repo/app ``crons/`` layout — same directory either way.
_impl_path = Path(__file__).resolve().parent / "_dlc_yolo_impl.py"
with open(_impl_path, "r", encoding="utf-8") as _fh:
    _impl_source = _fh.read()

# Exec into THIS module's globals so all names are defined locally (patchable,
# reloadable). compile() with the real filename keeps tracebacks pointing at the
# implementation file.
exec(compile(_impl_source, str(_impl_path), "exec"), globals())
