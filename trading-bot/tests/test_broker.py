"""Tests for the live broker logic, using a fake MCP tool-caller.

The real Robinhood MCP can't be reached from CI, so these drive the
review -> place -> poll flow with canned responses to prove the control flow,
safety caps, and fill accounting are correct.

Run:  python tests/test_broker.py   (or: python -m pytest -q)
"""
from __future__ import annotations

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.broker import RobinhoodMCPBroker
from bot.risk import Order
from bot.state import State


class FakeTool:
    """Records calls and returns scripted responses keyed by tool name."""

    def __init__(self, responses: dict):
        self.responses = responses
        self.calls: list[tuple[str, dict]] = []

    def __call__(self, name: str, arguments: dict) -> dict:
        self.calls.append((name, arguments))
        resp = self.responses[name]
        return resp(arguments) if callable(resp) else resp


def make_broker(tool, **kw):
    return RobinhoodMCPBroker(tool, "ACCT-7040", poll_attempts=1, poll_interval=0,
                              **kw)


def test_happy_path_places_and_records_fill():
    tool = FakeTool({
        "review_equity_order": {"alerts": []},
        "place_equity_order": {"id": "ord-1", "state": "confirmed"},
        "get_equity_orders": {"orders": [
            {"state": "filled", "average_price": "100.50",
             "cumulative_quantity": "2.0"}
        ]},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 2.0, 100.0, "build to target")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "filled", result
    assert result["fill_price"] == 100.50
    assert "SPY" in state.positions
    assert abs(state.cash - (1000.0 - 100.50 * 2.0)) < 1e-6  # filled at real price
    # review then place then poll
    assert [c[0] for c in tool.calls] == [
        "review_equity_order", "place_equity_order", "get_equity_orders"]


def test_notional_cap_refuses_oversized_order():
    tool = FakeTool({})  # should never be called
    broker = make_broker(tool, max_order_notional=50.0)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 2.0, 100.0, "too big")  # $200 > $50 cap
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "refused"
    assert not tool.calls, "no tool calls should happen for a refused order"


def test_test_mode_notional_overrides_to_tiny():
    tool = FakeTool({})
    broker = make_broker(tool, max_order_notional=450.0, test_mode_max_notional=2.0)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 0.1, 100.0, "ten bucks")  # $10 > $2 test cap
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "refused", result


def test_blocking_review_alert_skips_order():
    tool = FakeTool({
        "review_equity_order": {"alerts": [{"type": "pdt", "message": "rejected: PDT"}]},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 1.0, 100.0, "blocked")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "skipped"
    assert [c[0] for c in tool.calls] == ["review_equity_order"]  # never placed
    assert "SPY" not in state.positions


def test_review_only_places_nothing():
    tool = FakeTool({"review_equity_order": {"alerts": [], "quote": {"price": "100"}}})
    broker = make_broker(tool, review_only=True)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 1.0, 100.0, "review only")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "review_only"
    assert [c[0] for c in tool.calls] == ["review_equity_order"]
    assert not state.positions


def test_handles_data_wrapped_envelope():
    # Robinhood wraps payloads as {"data": {...}, "guide": ...}; the broker must
    # read fields inside "data".
    tool = FakeTool({
        "review_equity_order": {"data": {"alerts": []}, "guide": "..."},
        "place_equity_order": {"data": {"id": "ord-9", "state": "confirmed"},
                               "guide": "..."},
        "get_equity_orders": {"data": {"orders": [
            {"state": "filled", "average_price": "200.00",
             "cumulative_quantity": "1.0"}
        ]}, "guide": "..."},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "QQQ", 1.0, 199.0, "wrapped envelope")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "filled", result
    assert result["fill_price"] == 200.0
    assert result["order_id"] == "ord-9"
    assert "QQQ" in state.positions


def test_rejected_state_in_envelope_blocks():
    tool = FakeTool({
        "review_equity_order": {"data": {"alerts": []}},
        "place_equity_order": {"data": {"id": "x", "state": "rejected"}},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 1.0, 100.0, "will be rejected")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "rejected", result
    assert "SPY" not in state.positions


def test_fill_falls_back_to_reference_price_when_unparseable():
    tool = FakeTool({
        "review_equity_order": {"alerts": []},
        "place_equity_order": {"id": "ord-2"},
        "get_equity_orders": {"orders": []},  # never reaches filled
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 1.0, 100.0, "no fill data")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "filled"
    assert result["fill_price"] == 100.0  # reference price fallback
    assert "SPY" in state.positions


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} tests passed")
