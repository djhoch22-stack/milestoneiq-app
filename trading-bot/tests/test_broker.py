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


def test_backstop_refuses_oversized_order():
    tool = FakeTool({})  # should never be called
    broker = make_broker(tool, max_order_notional=50.0)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 2.0, 100.0, "too big")  # $200 > $50 backstop
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "refused"
    assert not tool.calls, "no tool calls should happen for a refused order"


def test_test_mode_clamps_buy_down_to_cap():
    tool = FakeTool({
        "review_equity_order": {"data": {"alerts": []}},
        "place_equity_order": {"data": {"id": "ord-3", "state": "confirmed"}},
        "get_equity_orders": {"data": {"orders": [
            {"state": "filled", "average_price": "100.00",
             "cumulative_quantity": "0.02"}
        ]}},
    })
    broker = make_broker(tool, max_order_notional=450.0, test_mode_max_notional=2.0)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 5.0, 100.0, "would be $500")  # clamp to $2 -> 0.02
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "filled", result
    # placed quantity should reflect the $2 clamp (0.02 sh @ $100), not 5.0
    place_call = next(c for c in tool.calls if c[0] == "place_equity_order")
    assert place_call[1]["quantity"] == "0.0200", place_call[1]
    assert abs(state.positions["SPY"].shares - 0.02) < 1e-6


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


def test_order_checks_blocking_alert_skips():
    # Real alerts come under `order_checks`; a blocking one must stop the order.
    tool = FakeTool({
        "review_equity_order": {"data": {
            "order_checks": {"pdt": {"message": "order would be rejected: PDT"}}}},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 1.0, 100.0, "pdt block")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "skipped", result
    assert [c[0] for c in tool.calls] == ["review_equity_order"]


def test_empty_order_checks_does_not_block():
    # The real "no alerts" shape is an empty dict — must NOT block.
    tool = FakeTool({
        "review_equity_order": {"data": {"order_checks": {}}},
        "place_equity_order": {"data": {"id": "ok", "state": "confirmed"}},
        "get_equity_orders": {"data": {"orders": [
            {"state": "filled", "average_price": "100.00",
             "cumulative_quantity": "1.0"}]}},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 1.0, 100.0, "no alerts")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "filled", result


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


def test_unconfirmed_order_returns_pending_no_position():
    # An order that never reaches "filled" must NOT be recorded as a position.
    tool = FakeTool({
        "review_equity_order": {"data": {"order_checks": {}}},
        "place_equity_order": {"data": {"order": {"id": "ord-2",
                                                  "state": "unconfirmed"}}},
        "get_equity_orders": {"data": {"order": {"id": "ord-2",
                                                 "state": "unconfirmed"}}},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SPY", 1.0, 100.0, "never fills")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "pending", result
    assert "SPY" not in state.positions
    assert abs(state.cash - 1000.0) < 1e-9  # cash untouched


def test_nested_place_then_confirmed_fill():
    # Real shapes: place -> {"data": {"order": {...}}}; fill confirmed by polling.
    tool = FakeTool({
        "review_equity_order": {"data": {"order_checks": {}}},
        "place_equity_order": {"data": {"order": {"id": "ord-7",
                                                  "state": "unconfirmed"}}},
        "get_equity_orders": {"data": {"order": {
            "id": "ord-7", "state": "filled", "average_price": "643.50",
            "cumulative_quantity": "0.0031"}}},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "SMH", 0.0031, 643.0, "real shape")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "filled", result
    assert result["fill_price"] == 643.50
    assert result["order_id"] == "ord-7"
    assert abs(state.positions["SMH"].shares - 0.0031) < 1e-9


def test_api_error_text_rejected_no_position():
    # Robinhood rejections arrive as non-JSON {"_text": "API error 400: ..."}.
    tool = FakeTool({
        "review_equity_order": {"data": {"order_checks": {}}},
        "place_equity_order": {"_text": "API error 400: {\"non_field_errors\":"
                               "[\"complete your investor profile\"]}",
                               "isError": False},
    })
    broker = make_broker(tool)
    state = State(cash=1000.0, equity_high_water_mark=1000.0)
    order = Order("buy", "XLK", 0.0105, 190.0, "blocked by RH")
    result = broker.execute(order, state, datetime(2026, 6, 16))
    assert result["status"] == "rejected", result
    assert "XLK" not in state.positions
    assert abs(state.cash - 1000.0) < 1e-9


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} tests passed")
