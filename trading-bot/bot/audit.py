"""Append-only audit log.

Every run writes one or more JSON lines recording exactly what the bot saw and
did. This is your record for reviewing behavior and for taxes/accounting if you
ever go live. Append-only by design — the bot never rewrites history.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


class AuditLog:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, event: str, **fields) -> None:
        record = {"ts": datetime.now().isoformat(), "event": event, **fields}
        with open(self.path, "a") as f:
            f.write(json.dumps(record) + "\n")
