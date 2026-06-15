#!/usr/bin/env python3
"""Entry point — one decision pass of the momentum bot.

Designed to be run on a schedule (cron / launchd), not as a long-running loop.
Each invocation: load state, refresh prices, run the strategy, apply risk
limits, execute (or simulate) the resulting orders, persist state, log.

Usage:
    python run.py                  # uses ./config.yaml
    python run.py --config x.yaml
    python run.py --once           # explicit single pass (default behavior)
    python run.py --status         # print current state and exit (no trading)
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

from bot.audit import AuditLog
from bot.broker import make_broker
from bot.config import load_config
from bot.risk import RiskEngine
from bot.state import State
from bot.strategy import compute_signals, fetch_prices, target_portfolio


def print_status(state: State, prices: dict[str, float]) -> None:
    equity = state.equity(prices)
    print(f"\n  Mode state : {'HALTED — ' + state.halted_reason if state.halted else 'active'}")
    print(f"  Cash       : ${state.cash:,.2f}")
    print(f"  Equity     : ${equity:,.2f}")
    print(f"  High-water : ${state.equity_high_water_mark:,.2f}")
    print(f"  Positions  :")
    if not state.positions:
        print("      (none)")
    for s, p in state.positions.items():
        px = prices.get(s, p.avg_price)
        pnl = (px / p.avg_price - 1) * 100 if p.avg_price else 0
        print(f"      {s:<6} {p.shares:>10.4f} @ ${p.avg_price:>8.2f}  "
              f"now ${px:>8.2f}  ({pnl:+.1f}%)")
    print()


def main() -> int:
    parser = argparse.ArgumentParser(description="Aggressive-momentum trading bot")
    parser.add_argument("--config", default=str(Path(__file__).parent / "config.yaml"))
    parser.add_argument("--once", action="store_true", help="single pass (default)")
    parser.add_argument("--status", action="store_true", help="show state, no trading")
    parser.add_argument("--review-only", action="store_true",
                        help="live mode only: run review_equity_order for each "
                             "planned order but place NOTHING (validation gate)")
    args = parser.parse_args()

    if not Path(args.config).exists():
        print(f"ERROR: config not found at {args.config}\n"
              f"Copy config.example.yaml to config.yaml and edit it.", file=sys.stderr)
        return 2

    cfg = load_config(args.config)
    audit = AuditLog(cfg.audit_log)
    state = State.load_or_create(cfg.state_file, cfg.starting_cash)
    now = datetime.now()

    # Refresh prices for everything we care about (watchlist + held names).
    symbols = sorted(set(cfg.strategy.watchlist) | set(state.positions))
    closes = fetch_prices(symbols, cfg.strategy.lookback_days,
                          cfg.strategy.trend_filter_sma_days)
    prices = {s: float(closes[s].dropna().iloc[-1])
              for s in closes.columns if not closes[s].dropna().empty}

    # Flag any watchlist names we couldn't price this run — they're excluded from
    # ranking, so keep a record rather than dropping them silently.
    missing = [s for s in cfg.strategy.watchlist if s not in prices]
    if missing:
        print(f"  ⚠ No price data for: {', '.join(missing)} "
              f"(excluded from ranking this run)")
        audit.write("data_warning", missing_symbols=missing)

    if args.status:
        print_status(state, prices)
        return 0

    print_status(state, prices)

    # Kill-switch file: hard pause, no trading.
    if cfg.kill_switch_file.exists():
        print(f"  Kill-switch file present ({cfg.kill_switch_file.name}) — no trades.")
        audit.write("kill_switch_active", file=str(cfg.kill_switch_file))
        return 0

    # Strategy -> target portfolio.
    signals = compute_signals(closes, cfg.strategy)
    targets = target_portfolio(signals, cfg.strategy)
    audit.write("signals",
                signals=[{"symbol": s.symbol, "momentum": round(s.momentum, 4),
                          "uptrend": s.in_uptrend, "eligible": s.eligible}
                         for s in signals],
                targets=targets)

    # Risk engine -> allowed orders.
    engine = RiskEngine(cfg.risk)
    orders = engine.decide(state, prices, targets, now)

    if state.halted:
        print(f"  ⚠ {state.halted_reason}")
        audit.write("halted", reason=state.halted_reason)

    if args.review_only and not cfg.is_live:
        print("  --review-only requires mode: live (it exercises the review tool).")
        return 2

    # Execute. dry-run simulates; live reviews+places real orders; --review-only
    # runs the review step but places nothing.
    broker = make_broker(cfg, review_only=args.review_only, audit=audit)
    if args.review_only:
        label = "REVIEW-ONLY — no orders placed"
    elif cfg.is_live:
        label = "LIVE — REAL MONEY"
    else:
        label = "simulation"
    print(f"  Broker     : {broker.name}  ({label})")
    if not orders:
        print("  Decision   : no orders this run.")
    for o in orders:
        result = broker.execute(o, state, now)
        line = (f"  {o.side.upper():<4} {o.shares:>10.4f} {o.symbol:<6} "
                f"@ ${o.price:>8.2f}  ({o.reason})")
        print(line + f"  -> {result['status']}"
              + (f": {result['reason']}" if result.get("reason") else ""))
        audit.write("order", side=o.side, symbol=o.symbol, shares=o.shares,
                    price=o.price, notional=round(o.notional, 2), reason=o.reason,
                    mode=cfg.mode, result=result)

    state.last_run = now.isoformat()
    state.save(cfg.state_file)
    audit.write("run_complete", equity=round(state.equity(prices), 2),
                cash=round(state.cash, 2), mode=cfg.mode,
                orders=len(orders), halted=state.halted)
    print(f"\n  Saved state -> {cfg.state_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
