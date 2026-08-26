"""DLC-YOLO — in-process gateway routes.

Registered via manifest backend.routes field. Runs inside the gateway process
so no separate backend spawn is needed (avoids the third-party execution policy).
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from aiohttp import web

DATA_DIR = Path("/tmp/dlc-yolo")

STAGES = [
    "intake", "requirements", "gate-spec", "design", "tasks",
    "gate-impl", "implement", "review", "gate-review", "pr", "done"
]

GATES = {"gate-spec", "gate-impl", "gate-review"}


def _ensure_data():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    state_file = DATA_DIR / "state.json"
    if not state_file.exists():
        state_file.write_text(json.dumps({"cards": []}, indent=2))
    return state_file


def _load_state():
    return json.loads(_ensure_data().read_text())


def _save_state(state):
    _ensure_data().write_text(json.dumps(state, indent=2))


def _now():
    return datetime.now(timezone.utc).isoformat()


async def get_cards(request: web.Request) -> web.Response:
    state = _load_state()
    return web.json_response({"cards": state["cards"]})


async def get_card(request: web.Request) -> web.Response:
    card_id = request.match_info["id"]
    state = _load_state()
    card = next((c for c in state["cards"] if c["id"] == card_id), None)
    if not card:
        return web.json_response({"error": "card not found"}, status=404)
    return web.json_response(card)


async def create_card(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except json.JSONDecodeError:
        body = {}
    card = {
        "id": str(uuid.uuid4())[:8],
        "title": body.get("title", "Untitled"),
        "source": body.get("source", {}),
        "stage": "intake",
        "created_at": _now(),
        "updated_at": _now(),
        "artifacts": {},
        "gate_history": [],
        "history": [],
    }
    state = _load_state()
    state["cards"].append(card)
    _save_state(state)
    return web.json_response(card, status=201)


async def advance_card(request: web.Request) -> web.Response:
    card_id = request.match_info["id"]
    try:
        body = await request.json()
    except (json.JSONDecodeError, Exception):
        body = {}
    state = _load_state()
    card = next((c for c in state["cards"] if c["id"] == card_id), None)
    if not card:
        return web.json_response({"error": "card not found"}, status=404)
    current_idx = STAGES.index(card["stage"])
    if current_idx >= len(STAGES) - 1:
        return web.json_response({"error": "card already done"}, status=400)
    old_stage = card["stage"]
    card["stage"] = STAGES[current_idx + 1]
    card["updated_at"] = _now()
    card["history"].append({
        "from": old_stage,
        "to": card["stage"],
        "at": _now(),
        "agent": body.get("agent", "manual"),
    })
    _save_state(state)
    return web.json_response(card)


async def gate_approve(request: web.Request) -> web.Response:
    card_id = request.match_info["id"]
    try:
        body = await request.json()
    except (json.JSONDecodeError, Exception):
        body = {}
    state = _load_state()
    card = next((c for c in state["cards"] if c["id"] == card_id), None)
    if not card:
        return web.json_response({"error": "card not found"}, status=404)
    if card["stage"] not in GATES:
        return web.json_response({"error": f"card not at a gate (at {card['stage']})"}, status=400)
    card["gate_history"].append({
        "gate": card["stage"],
        "decision": "approved",
        "at": _now(),
        "notes": body.get("notes", ""),
    })
    current_idx = STAGES.index(card["stage"])
    old_stage = card["stage"]
    card["stage"] = STAGES[current_idx + 1]
    card["updated_at"] = _now()
    card["history"].append({
        "from": old_stage,
        "to": card["stage"],
        "at": _now(),
        "agent": "human",
    })
    _save_state(state)
    return web.json_response(card)


async def gate_reject(request: web.Request) -> web.Response:
    card_id = request.match_info["id"]
    try:
        body = await request.json()
    except (json.JSONDecodeError, Exception):
        body = {}
    state = _load_state()
    card = next((c for c in state["cards"] if c["id"] == card_id), None)
    if not card:
        return web.json_response({"error": "card not found"}, status=404)
    if card["stage"] not in GATES:
        return web.json_response({"error": f"card not at a gate (at {card['stage']})"}, status=400)
    card["gate_history"].append({
        "gate": card["stage"],
        "decision": "rejected",
        "at": _now(),
        "notes": body.get("notes", ""),
    })
    current_idx = STAGES.index(card["stage"])
    old_stage = card["stage"]
    card["stage"] = STAGES[current_idx - 1]
    card["updated_at"] = _now()
    card["history"].append({
        "from": old_stage,
        "to": card["stage"],
        "at": _now(),
        "agent": "human",
    })
    _save_state(state)
    return web.json_response(card)


async def get_status(request: web.Request) -> web.Response:
    state = _load_state()
    by_stage = {}
    for c in state["cards"]:
        by_stage.setdefault(c["stage"], []).append(c["id"])
    return web.json_response({"total": len(state["cards"]), "by_stage": by_stage})


def register_routes(app: web.Application) -> None:
    """Register DLC-YOLO API routes on the gateway's aiohttp app."""
    app.router.add_get("/api/apps/dlc-yolo/cards", get_cards)
    app.router.add_get("/api/apps/dlc-yolo/cards/{id}", get_card)
    app.router.add_post("/api/apps/dlc-yolo/cards", create_card)
    app.router.add_post("/api/apps/dlc-yolo/cards/{id}/advance", advance_card)
    app.router.add_post("/api/apps/dlc-yolo/cards/{id}/gate-approve", gate_approve)
    app.router.add_post("/api/apps/dlc-yolo/cards/{id}/gate-reject", gate_reject)
    app.router.add_get("/api/apps/dlc-yolo/status", get_status)
