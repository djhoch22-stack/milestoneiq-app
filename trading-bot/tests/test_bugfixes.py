"""Tests for the silent-failure / false-halt bug fixes."""
from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot import notify
from bot.config import AlertsConfig, RiskConfig
from bot.risk import RiskEngine
from bot.state import Position, State


def _risk() -> RiskConfig:
    return RiskConfig(max_position_pct=0.34, min_cash_pct=0.1,
                      trailing_stop_pct=0.08, max_drawdown_kill_pct=0.15,
                      max_day_trades_per_5d=3, max_orders_per_run=5)


def _state_holding_xlk(cash: float, broker_equity: float) -> State:
    s = State(cash=cash, equity_high_water_mark=1007.74, broker_equity=broker_equity)
    s.positions["XLK"] = Position(symbol="XLK", shares=1.67, avg_price=190.45,
                                  high_price=203.0, opened_at="2026-01-01T00:00:00")
    return s


def test_no_false_halt_when_broker_equity_is_healthy():
    # Spendable cash is low (unsettled proceeds), so locally-computed equity looks
    # crashed — but the broker's true total value is healthy. Must NOT halt.
    state = _state_holding_xlk(cash=100.0, broker_equity=1001.46)
    orders = RiskEngine(_risk()).decide(state, {"XLK": 203.0}, {}, datetime(2026, 10, 6))
    assert state.halted is False, state.halted_reason


def test_real_drawdown_still_halts_without_broker_equity():
    # No broker_equity (dry-run / unknown): fall back to computed equity, which is
    # genuinely below the floor -> the kill switch must still fire.
    state = _state_holding_xlk(cash=100.0, broker_equity=0.0)
    RiskEngine(_risk()).decide(state, {"XLK": 203.0}, {}, datetime(2026, 10, 6))
    assert state.halted is True


def test_real_drawdown_halts_even_with_broker_equity():
    # Broker itself confirms the account is below the floor -> still halts.
    state = _state_holding_xlk(cash=10.0, broker_equity=500.0)
    RiskEngine(_risk()).decide(state, {"XLK": 203.0}, {}, datetime(2026, 10, 6))
    assert state.halted is True


def test_full_exit_sell_never_exceeds_holdings():
    # Regression: holding 1.670586 shares must not produce a sell of 1.6706
    # (rounded UP) -> "Not enough shares to sell". Must floor to <= holdings.
    held = 1.670586
    state = State(cash=10.0, equity_high_water_mark=1007.74, broker_equity=1001.0)
    state.positions["XLK"] = Position(symbol="XLK", shares=held, avg_price=190.45,
                                      high_price=203.0, opened_at="2026-01-01T00:00:00")
    orders = RiskEngine(_risk()).decide(state, {"XLK": 203.0}, {}, datetime(2026, 10, 6))
    sells = [o for o in orders if o.side == "sell" and o.symbol == "XLK"]
    assert sells and sells[0].shares <= held, sells
    assert sells[0].shares == 1.6705  # floored to 4 dp, not 1.6706


def test_broker_quantity_is_floored_not_rounded_up():
    from bot.broker import RobinhoodMCPBroker
    from bot.risk import Order
    b = RobinhoodMCPBroker(call_tool=None, account_number="X")
    args = b._base_args(Order(side="sell", symbol="XLK", shares=1.670586,
                              price=203.0, reason="exit"))
    assert args["quantity"] == "1.6705", args["quantity"]


def test_buys_capped_to_settled_cash_ignoring_sale_proceeds():
    # A concurrent sell must NOT fund same-run buys (cash-account settlement).
    state = State(cash=50.0, equity_high_water_mark=350.0, broker_equity=350.0)
    state.positions["XLK"] = Position(symbol="XLK", shares=1.0, avg_price=300.0,
                                      high_price=300.0, opened_at="2026-01-01T00:00:00")
    orders = RiskEngine(_risk()).decide(state, {"XLK": 300.0, "GOOGL": 300.0},
                                        {"GOOGL": 1.0}, datetime(2026, 10, 6))
    spent = sum(o.notional for o in orders if o.side == "buy")
    assert spent <= 50.0 + 1e-6, spent


class _Cfg:
    def __init__(self, data_dir: Path):
        self.state_file = data_dir / "state.json"
        self.alerts = AlertsConfig()


def test_heartbeat_writes_status():
    with tempfile.TemporaryDirectory() as d:
        cfg = _Cfg(Path(d))
        notify.heartbeat(cfg, "ok", "ran fine", orders=2)
        out = (Path(d) / "last_status.json")
        assert out.exists()
        import json
        data = json.loads(out.read_text())
        assert data["status"] == "ok" and data["orders"] == 2


def test_alert_writes_files_and_never_raises():
    with tempfile.TemporaryDirectory() as d:
        cfg = _Cfg(Path(d))
        notify.alert(cfg, "test subject", "test body")  # must not raise
        assert (Path(d) / "ALERT.txt").exists()
        assert (Path(d) / "alerts.log").exists()
        assert "test subject" in (Path(d) / "ALERT.txt").read_text()


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} tests passed")
