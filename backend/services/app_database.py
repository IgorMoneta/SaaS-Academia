from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DB_PATH = Path(
    os.getenv(
        "FITSAAS_DB_PATH",
        Path(__file__).resolve().parents[1] / "data" / "fitsaas.sqlite3",
    )
)


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    return connection


def load_app_state() -> dict[str, Any] | None:
    with _connect() as connection:
        row = connection.execute(
            "SELECT payload FROM app_state WHERE id = 1"
        ).fetchone()

    if not row:
        return None

    return json.loads(row["payload"])


def save_app_state(payload: dict[str, Any]) -> dict[str, str]:
    updated_at = datetime.now(timezone.utc).isoformat()
    serialized = json.dumps(payload, ensure_ascii=False)

    with _connect() as connection:
        connection.execute(
            """
            INSERT INTO app_state (id, payload, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = excluded.updated_at
            """,
            (serialized, updated_at),
        )

    return {
        "status": "ok",
        "updated_at": updated_at,
        "database": str(DB_PATH),
    }
