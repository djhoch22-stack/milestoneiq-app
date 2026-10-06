#!/usr/bin/env python3
"""Re-authorize the Robinhood login (one-time, interactive).

Scheduled runs can't open a browser, so when the login token expires they now
fail fast and alert you instead of hanging. Run this at the Mac to refresh it:
it opens the browser once, you approve, and the fresh token is cached for the
unattended runs. Places NO orders — it only makes a read-only portfolio call to
exercise the login.

Usage (from trading-bot/):
    .venv/bin/python scripts/reauth.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Make sure we run INTERACTIVELY even if this env var is set in the shell.
os.environ.pop("BOT_NONINTERACTIVE", None)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot.config import load_config
from bot.mcp_client import RobinhoodMCP


def main() -> int:
    cfg = load_config(Path(__file__).resolve().parent.parent / "config.yaml")
    if not cfg.execution.account_number:
        print("ERROR: set execution.account_number in config.yaml first.")
        return 2

    client = RobinhoodMCP(cfg.execution.mcp_url,
                          cfg.state_file.parent / "mcp_tokens.json")
    print("Authorizing Robinhood (a browser window will open — approve it)...")
    try:
        resp = client.call_tool("get_portfolio",
                                {"account_number": cfg.execution.account_number})
    except Exception as e:  # noqa: BLE001
        print(f"\n✗ Re-auth failed: {e}")
        return 1

    if resp.get("isError"):
        print(f"\n✗ Logged in but the portfolio call errored: {resp}")
        return 1
    tv = (resp.get("data") or {}).get("total_value")
    print(f"\n✓ Re-authorized. Token cached. Account value: ${tv}")
    print("  Scheduled runs will now work without a browser.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
