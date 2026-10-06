#!/usr/bin/env python3
"""Preview which stocks the congress-mirroring strategy would target — no trading.

Fetches the disclosure dataset and prints the member's recent buys that the bot
would hold, using your config.yaml's strategy.congress settings. Safe to run any
time; it touches no account and places no orders.

Usage (from trading-bot/, venv active):
    python scripts/preview_congress.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot.config import load_config
from bot.congress import fetch_transactions, member_picks


def main() -> int:
    cfg_path = Path(__file__).resolve().parent.parent / "config.yaml"
    if not cfg_path.exists():
        print("ERROR: config.yaml not found. Copy config.example.yaml first.")
        return 2
    cg = load_config(cfg_path).strategy.congress

    print(f"\nFetching disclosures for '{cg.member}' "
          f"(last {cg.lookback_days} days, top {cg.top_n})...")
    try:
        txns = fetch_transactions(cg.data_url)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR fetching disclosures: {e}")
        return 1

    picks = member_picks(txns, cg)
    if not picks:
        print("\nNo qualifying recent buys — the bot would hold cash.")
        return 0

    print(f"\nThe bot would hold these {len(picks)} names (equal weight):\n")
    print(f"  {'TICKER':<8} {'LAST BUY':<12} {'TYPE'}")
    for p in picks:
        print(f"  {p.ticker:<8} {p.last_date.isoformat():<12} "
              f"{'call option->shares' if p.is_option else 'shares'}")
    print("\nReminder: disclosures lag the actual trade by up to ~45 days, and "
          "option trades are mirrored as the underlying shares.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
