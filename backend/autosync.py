"""Self-healing GitHub webhook re-point for rotating Cloudflare quick tunnels.

A Cloudflare *quick* tunnel (``cloudflared tunnel --url http://127.0.0.1:<port>``)
gets a NEW random ``https://<id>.trycloudflare.com`` hostname on every start, so a
GitHub webhook pointed at the previous URL silently delivers into a dead tunnel and
the event-driven fast-path goes dark until someone re-pastes the URL by hand.

When the app-managed tunnel start captures a fresh URL, this module re-points the
configured repositories' GitHub webhooks to ``<new-url>/github`` — but ONLY the
hook that already points at a ``*.trycloudflare.com`` host. A hand-set stable URL
(a named tunnel, ngrok, a Tailscale Funnel) is NEVER touched, so enabling auto-sync
can never clobber a durable endpoint.

CONTAINMENT (the whole reason this is opt-in and narrow):
  * OFF by default — a pipeline must set ``autosync: true`` in webhook-config.json.
  * Only rewrites a hook whose current ``config.url`` host ends ``.trycloudflare.com``.
  * Only the exact allowlisted repositories the receiver already knows.
  * Idempotent: a hook already at ``<new>/github`` is a no-op.
  * Uses the ambient ``gh`` auth; never reads, stores, or logs a token or secret.

The GitHub writes go through an injected async ``gh`` runner so this module is
unit-testable with no network and no real ``gh`` binary.
"""

from __future__ import annotations

import json
import logging
from typing import Awaitable, Callable
from urllib.parse import urlparse

logger = logging.getLogger("kirocrew.app.dlc-yolo.autosync")

# The only host suffix we will ever rewrite. A hook on any other host is a
# deliberately-configured stable endpoint and is left strictly alone.
_QUICK_TUNNEL_SUFFIX = ".trycloudflare.com"

# argv -> (returncode, stdout). Injected so tests need no real gh / network.
GhRunner = Callable[[list[str]], Awaitable[tuple[int, str]]]


def _is_quick_tunnel_url(url: object) -> bool:
    """True only for an ``https://<id>.trycloudflare.com[/...]`` URL."""
    if not isinstance(url, str) or not url:
        return False
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return False
    return host.endswith(_QUICK_TUNNEL_SUFFIX)


def _payload_url_for(new_public_url: str) -> str:
    """The canonical ``/github`` payload URL for a captured tunnel base URL."""
    return f"{new_public_url.rstrip('/')}/github"


async def resync_repository(
    repo: str, new_payload_url: str, gh: GhRunner,
) -> dict:
    """Re-point one repo's quick-tunnel webhook to ``new_payload_url``.

    Returns a compact, privacy-safe result record: no secret, no signature, no
    hook body beyond the hook id and the before/after payload URL. ``action`` is
    one of ``updated`` | ``noop`` | ``skipped-stable`` | ``no-hook`` | ``error``.
    """
    result: dict = {"repo": repo, "action": "error", "hook_id": None}
    try:
        code, out = await gh(["api", f"repos/{repo}/hooks", "--paginate"])
    except Exception as exc:  # pragma: no cover - defensive
        result["error"] = f"list-failed:{type(exc).__name__}"
        return result
    if code != 0:
        result["error"] = "list-failed"
        return result
    try:
        hooks = json.loads(out or "[]")
    except json.JSONDecodeError:
        result["error"] = "list-unparseable"
        return result
    if not isinstance(hooks, list):
        result["error"] = "list-unexpected"
        return result

    # Find the ONE hook currently on a quick-tunnel host. If none, the repo has
    # no rotating hook to heal (a stable one is intentionally skipped).
    target = None
    saw_stable = False
    for hook in hooks:
        if not isinstance(hook, dict):
            continue
        url = ((hook.get("config") or {}) if isinstance(hook.get("config"), dict) else {}).get("url")
        if _is_quick_tunnel_url(url):
            target = hook
            break
        if isinstance(url, str) and url.endswith("/github"):
            saw_stable = True
    if target is None:
        result["action"] = "skipped-stable" if saw_stable else "no-hook"
        return result

    hook_id = target.get("id")
    result["hook_id"] = hook_id
    current = (target.get("config") or {}).get("url")
    if current == new_payload_url:
        result["action"] = "noop"
        return result

    try:
        code, _ = await gh([
            "api", "-X", "PATCH", f"repos/{repo}/hooks/{hook_id}",
            "-f", f"config[url]={new_payload_url}",
            "-f", "config[content_type]=json",
        ])
    except Exception as exc:  # pragma: no cover - defensive
        result["error"] = f"patch-failed:{type(exc).__name__}"
        return result
    if code != 0:
        result["error"] = "patch-failed"
        return result
    result["action"] = "updated"
    result["from"] = current if isinstance(current, str) else None
    result["to"] = new_payload_url
    return result


async def autosync_hooks(
    new_public_url: str, repositories: list[str], gh: GhRunner,
) -> dict:
    """Re-point every allowlisted repo's quick-tunnel hook to the new URL.

    Caller is responsible for the opt-in gate — this runs unconditionally over the
    supplied repositories. Returns ``{payload_url, results:[...]}``.
    """
    if not _is_quick_tunnel_url(new_public_url + "/x"):
        # new_public_url must itself be a quick-tunnel base; refuse to broadcast a
        # non-quick URL (would defeat the "only rewrite rotating hooks" guard).
        return {"payload_url": None, "results": [], "error": "new-url-not-quick-tunnel"}
    payload_url = _payload_url_for(new_public_url)
    results = []
    for repo in repositories or []:
        if not isinstance(repo, str) or "/" not in repo:
            results.append({"repo": repo, "action": "error", "error": "bad-repo"})
            continue
        results.append(await resync_repository(repo, payload_url, gh))
    return {"payload_url": payload_url, "results": results}
