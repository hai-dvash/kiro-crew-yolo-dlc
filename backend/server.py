"""DLC-YOLO backend — state engine and API.

The gateway proxies /apps/dlc-yolo/api/* to this server's root.
So /apps/dlc-yolo/api/cards → this server's /cards
"""
import json
import os
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

PORT = int(os.environ.get("PORT", 9100))
APP_NAME = os.environ.get("KIROCREW_APP_NAME", "dlc-yolo")
DATA_DIR = Path(os.environ.get("KIROCREW_APP_DATA", "/tmp/dlc-yolo"))

STAGES = [
    "intake", "requirements", "gate-spec", "design", "tasks",
    "gate-impl", "implement", "review", "gate-review", "pr", "done"
]

GATES = {"gate-spec", "gate-impl", "gate-review"}
AUTO_STAGES = set(STAGES) - GATES - {"done"}


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


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"status": "ok", "app": APP_NAME})
        elif self.path == "/api/cards":
            state = _load_state()
            self._json(200, {"cards": state["cards"]})
        elif self.path.startswith("/api/cards/"):
            card_id = self.path.split("/")[-1]
            state = _load_state()
            card = next((c for c in state["cards"] if c["id"] == card_id), None)
            if card:
                self._json(200, card)
            else:
                self._json(404, {"error": "card not found"})
        elif self.path == "/api/status":
            state = _load_state()
            by_stage = {}
            for c in state["cards"]:
                by_stage.setdefault(c["stage"], []).append(c["id"])
            self._json(200, {"total": len(state["cards"]), "by_stage": by_stage})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(content_length)) if content_length else {}
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid JSON"})
            return

        if self.path == "/api/cards":
            # Create a new card
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
            self._json(201, card)

        elif self.path.endswith("/advance"):
            card_id = self.path.split("/")[-2]
            state = _load_state()
            card = next((c for c in state["cards"] if c["id"] == card_id), None)
            if not card:
                self._json(404, {"error": "card not found"})
                return
            current_idx = STAGES.index(card["stage"])
            if current_idx >= len(STAGES) - 1:
                self._json(400, {"error": "card already done"})
                return
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
            self._json(200, card)

        elif self.path.endswith("/gate-approve"):
            card_id = self.path.split("/")[-2]
            state = _load_state()
            card = next((c for c in state["cards"] if c["id"] == card_id), None)
            if not card:
                self._json(404, {"error": "card not found"})
                return
            if card["stage"] not in GATES:
                self._json(400, {"error": f"card not at a gate (at {card['stage']})"})
                return
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
            self._json(200, card)

        elif self.path.endswith("/gate-reject"):
            card_id = self.path.split("/")[-2]
            state = _load_state()
            card = next((c for c in state["cards"] if c["id"] == card_id), None)
            if not card:
                self._json(404, {"error": "card not found"})
                return
            if card["stage"] not in GATES:
                self._json(400, {"error": f"card not at a gate (at {card['stage']})"})
                return
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
            self._json(200, card)

        else:
            self._json(404, {"error": "not found"})

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"{APP_NAME} backend on port {PORT}")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
