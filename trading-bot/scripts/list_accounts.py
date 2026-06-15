#!/usr/bin/env python3
"""Discover the Robinhood MCP tools and list your accounts.

This is a one-time helper to (a) confirm the real tool names/parameters of the
connected Robinhood server and (b) print your account numbers + agentic_allowed
flags so you can fill in execution.account_number in config.yaml.

It runs the bot's own MCP client (bot/mcp_client.py), so it authenticates with
its own OAuth — the first run opens your browser once, then caches the token.

Usage (from the trading-bot/ directory, with the venv active):
    python scripts/list_accounts.py          # tools + best-effort account table
    python scripts/list_accounts.py --raw     # dump raw JSON from every attempt

If the account table is empty, run --raw and send the output back so the exact
tool name / field names can be pinned down.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot.mcp_client import RobinhoodMCP


def main() -> int:
    raw = "--raw" in sys.argv
    base = Path(__file__).resolve().parent.parent
    cfg_path = base / "config.yaml"
    if not cfg_path.exists():
        print("ERROR: config.yaml not found. Copy config.example.yaml first.")
        return 2

    # Read only what we need directly — this helper must work BEFORE
    # execution.account_number is set, so it skips the strict live-mode checks
    # in load_config.
    raw_cfg = yaml.safe_load(cfg_path.read_text())
    execu = raw_cfg.get("execution", {}) or {}
    mcp_url = execu.get("mcp_url", "https://agent.robinhood.com/mcp/trading")
    state_file = base / raw_cfg["paths"]["state_file"]
    token_file = state_file.parent / "mcp_tokens.json"
    client = RobinhoodMCP(mcp_url, token_file)

    # 1) Discover the real tool set (also verifies auth + connectivity).
    print("\n=== Tools exposed by the Robinhood MCP server ===")
    tools = client.list_tools()
    for t in tools:
        req = f"  required: {t['required']}" if t["required"] else ""
        print(f"  • {t['name']}{req}")
    if raw:
        print("\n--- raw tool schemas ---")
        print(json.dumps(tools, indent=2))

    # 2) Try the account-listing tools, in order of likelihood. We don't know
    #    the exact name, so try common ones and any tool whose name mentions
    #    'account' and needs no required arguments.
    candidates = ["get_accounts", "list_accounts", "accounts", "get_account",
                  "get_account_details"]
    by_name = {t["name"]: t for t in tools}
    candidates += [t["name"] for t in tools
                   if "account" in t["name"].lower() and not t["required"]
                   and t["name"] not in candidates]

    print("\n=== Accounts ===")
    for name in candidates:
        if name not in by_name:
            continue
        try:
            resp = client.call_tool(name, {})
        except Exception as e:  # noqa: BLE001 - report and try the next candidate
            print(f"  ({name} failed: {e})")
            continue
        if raw:
            print(f"\n--- raw response from {name} ---")
            print(json.dumps(resp, indent=2))
        _print_accounts(resp, name)
        return 0

    print("  Could not find an account-listing tool automatically.")
    print("  Re-run with --raw and send the tool list back.")
    return 0


def _print_accounts(resp: dict, tool_name: str) -> None:
    # Responses are wrapped as {"data": {"accounts": [...]}}; handle that plus
    # a few unwrapped shapes.
    data = resp.get("data") if isinstance(resp, dict) else None
    accounts = None
    for src in (data, resp):
        if isinstance(src, dict):
            accounts = src.get("accounts") or src.get("results")
            if accounts:
                break
    if isinstance(resp, list):
        accounts = resp
    if not accounts:
        print(f"  {tool_name} returned no recognizable account list; use --raw.")
        return
    print(f"  (from {tool_name})")
    for a in accounts:
        num = a.get("account_number") or a.get("number") or a.get("id") or "?"
        agentic = a.get("agentic_allowed", a.get("is_agentic", "?"))
        nick = a.get("nickname") or a.get("type") or a.get("brokerage_account_type") or ""
        flag = "  <-- AGENTIC" if agentic is True else ""
        print(f"    {num}   agentic_allowed={agentic}   {nick}{flag}")
    print("\n  Put the agentic account's full account_number into config.yaml "
          "(execution.account_number).")


if __name__ == "__main__":
    raise SystemExit(main())
