#!/usr/bin/env python3
"""Dump the raw get_portfolio and get_equity_positions responses.

Used once to confirm the real response shapes so account reconciliation can be
wired correctly. Reads mcp_url + token location from config.yaml and the agentic
account number from execution.account_number.

Usage (from trading-bot/, venv active):
    python scripts/show_account_state.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot.mcp_client import RobinhoodMCP


def main() -> int:
    base = Path(__file__).resolve().parent.parent
    raw_cfg = yaml.safe_load((base / "config.yaml").read_text())
    execu = raw_cfg.get("execution", {}) or {}
    acct = execu.get("account_number", "")
    if not acct:
        print("ERROR: set execution.account_number in config.yaml first.")
        return 2
    mcp_url = execu.get("mcp_url", "https://agent.robinhood.com/mcp/trading")
    state_file = base / raw_cfg["paths"]["state_file"]
    client = RobinhoodMCP(mcp_url, state_file.parent / "mcp_tokens.json")

    for tool in ("get_portfolio", "get_equity_positions"):
        print(f"\n===== {tool}(account_number={acct}) =====")
        try:
            resp = client.call_tool(tool, {"account_number": acct})
            print(json.dumps(resp, indent=2))
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR: {e}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
