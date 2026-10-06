#!/usr/bin/env python3
"""Clear a latched drawdown halt so the bot can trade again.

The drawdown kill switch sets state.halted = True and keeps it that way until a
human reviews and clears it (by design — you want eyes on a real -15% drop). This
is that manual clear. It prints the current state and what tripped the halt, then
clears the flag. The next live run reconciles to your real account before trading.

Usage (from trading-bot/):
    .venv/bin/python scripts/clear_halt.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot.config import load_config
from bot.state import State


def main() -> int:
    cfg = load_config(Path(__file__).resolve().parent.parent / "config.yaml")
    state = State.load_or_create(cfg.state_file, cfg.starting_cash)

    if not state.halted:
        print("Bot is not halted — nothing to clear.")
        return 0

    print("Current halt:")
    print(f"  reason : {state.halted_reason}")
    print(f"  cash   : ${state.cash:,.2f}")
    print(f"  broker_equity (last reconcile): ${state.broker_equity:,.2f}")
    print(f"  positions: {list(state.positions) or '(none)'}")
    resp = input("\nClear the halt and allow trading again? [y/N] ").strip().lower()
    if resp != "y":
        print("Left halted. No change.")
        return 1

    state.halted = False
    state.halted_reason = ""
    state.save(cfg.state_file)
    print("\n✓ Halt cleared. The next run will reconcile to your real account "
          "first, then trade per your strategy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
