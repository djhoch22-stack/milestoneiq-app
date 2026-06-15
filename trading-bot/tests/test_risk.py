"""Tests for the deterministic risk engine — the safety-critical code.

These run without any network or broker. Run with:  python -m pytest -q
(from the trading-bot/ directory), or  python tests/test_risk.py
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import RiskConfig
from bot.risk import RiskEngine
from bot.state import Position, State, TradeRecord


def base_risk() -> RiskConfig:
    return RiskConfig(
        max_position_pct=0.40,
        min_cash_pct=0.05,
        trailing_stop_pct=0.08,
        max_drawdown_kill_pct=0.15,
        max_day_trades_per_5d=2,
        max_orders_per_run=4,
    )


def test_buys_toward_target_within_cash():
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    engine = RiskEngine(base_risk())
    orders = engine.decide(state, {"SPY": 100.0}, {"SPY": 1.0}, datetime(2026, 6, 15))
    buys = [o for o in orders if o.side == "buy"]
    assert buys, "expected a buy toward the target"
    # Sizing: min_cash 5% leaves $950 investable; max_position 40% caps SPY at
    # 0.40 * $950 = $380 -> 3.8 shares @ $100.
    assert abs(buys[0].shares - 3.8) < 1e-6, buys[0].shares
    assert buys[0].notional <= 1000.0


def test_never_spends_more_than_cash():
    state = State(cash=50.0, equity_high_water_mark=50.0)
    engine = RiskEngine(base_risk())
    orders = engine.decide(state, {"SPY": 100.0}, {"SPY": 1.0}, datetime(2026, 6, 15))
    spent = sum(o.notional for o in orders if o.side == "buy")
    assert spent <= 50.0 + 1e-6, spent


def test_trailing_stop_triggers_sell():
    state = State(cash=0.0, equity_high_water_mark=1000.0)
    state.positions["SPY"] = Position(
        symbol="SPY", shares=10, avg_price=100.0, high_price=110.0,
        opened_at="2026-06-01T10:00:00",  # opened earlier -> not a day trade
    )
    engine = RiskEngine(base_risk())
    # Price 100 is >8% below the high of 110 -> stop fires.
    orders = engine.decide(state, {"SPY": 100.0}, {"SPY": 1.0}, datetime(2026, 6, 15))
    assert any(o.side == "sell" and "trailing stop" in o.reason for o in orders)


def test_drawdown_kill_switch_liquidates_and_halts():
    state = State(cash=0.0, equity_high_water_mark=1000.0)
    state.positions["SPY"] = Position(
        symbol="SPY", shares=10, avg_price=100.0, high_price=100.0,
        opened_at="2026-06-01T10:00:00",
    )
    engine = RiskEngine(base_risk())
    # Equity now $800 = 20% below high of $1000 (> 15% kill threshold).
    orders = engine.decide(state, {"SPY": 80.0}, {"SPY": 1.0}, datetime(2026, 6, 15))
    assert state.halted
    assert all(o.side == "sell" for o in orders)
    assert any("drawdown" in o.reason for o in orders)


def test_pdt_limit_blocks_excess_day_trades():
    state = State(cash=0.0, equity_high_water_mark=1000.0)
    now = datetime(2026, 6, 15, 15, 0, 0)
    # Two day trades already used today -> budget exhausted (cap is 2).
    state.trade_history = [
        TradeRecord(timestamp=now.isoformat(), side="sell", symbol="AAA",
                    shares=1, price=1, is_day_trade=True),
        TradeRecord(timestamp=now.isoformat(), side="sell", symbol="BBB",
                    shares=1, price=1, is_day_trade=True),
    ]
    # A position opened TODAY whose sale would be a 3rd day trade.
    state.positions["SPY"] = Position(
        symbol="SPY", shares=10, avg_price=100.0, high_price=200.0,
        opened_at=now.isoformat(),
    )
    engine = RiskEngine(base_risk())
    # Big drop would normally trigger a stop-sell, but PDT must block it.
    orders = engine.decide(state, {"SPY": 100.0}, {}, now)
    assert not any(o.symbol == "SPY" and o.side == "sell" for o in orders), \
        "PDT limit should have blocked the day-trade sell"


def test_max_orders_per_run_caps_count():
    cfg = base_risk()
    cfg.max_orders_per_run = 1
    state = State(cash=10000.0, equity_high_water_mark=10000.0)
    engine = RiskEngine(cfg)
    targets = {"SPY": 0.3, "QQQ": 0.3, "IWM": 0.3}
    prices = {"SPY": 100.0, "QQQ": 100.0, "IWM": 100.0}
    orders = engine.decide(state, prices, targets, datetime(2026, 6, 15))
    assert len(orders) <= 1


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} tests passed")
