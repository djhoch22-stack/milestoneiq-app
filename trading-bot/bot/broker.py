"""Broker adapters — the ONLY place orders touch the outside world.

Two implementations:

  * DryRunBroker      — simulates fills against live market prices and updates
                        local state. Places no real orders. This is the default.

  * RobinhoodMCPBroker — places REAL orders via the Robinhood MCP server. It is
                        intentionally left as a guided stub: the real order-tool
                        names/parameters are only visible from inside the Claude
                        Code session where you authenticated, and must be wired
                        and tested there. See execute() for exactly what to fill
                        in. Until then it refuses to run, by design.

Both update State the same way after a fill, so the rest of the bot doesn't care
which one it's using.
"""
from __future__ import annotations

from datetime import datetime

from .risk import Order
from .state import Position, State, TradeRecord


def _apply_fill(state: State, order: Order, fill_price: float, now: datetime) -> None:
    """Mutate state to reflect an executed order. Shared by all brokers."""
    is_day_trade = False
    if order.side == "buy":
        pos = state.positions.get(order.symbol)
        if pos:
            total_cost = pos.avg_price * pos.shares + fill_price * order.shares
            pos.shares += order.shares
            pos.avg_price = total_cost / pos.shares
            pos.high_price = max(pos.high_price, fill_price)
        else:
            state.positions[order.symbol] = Position(
                symbol=order.symbol,
                shares=order.shares,
                avg_price=fill_price,
                high_price=fill_price,
                opened_at=now.isoformat(),
            )
        state.cash -= fill_price * order.shares
    else:  # sell
        pos = state.positions.get(order.symbol)
        if pos:
            opened = datetime.fromisoformat(pos.opened_at).date()
            is_day_trade = opened == now.date()
            pos.shares -= order.shares
            if pos.shares <= 1e-9:
                del state.positions[order.symbol]
        state.cash += fill_price * order.shares

    state.trade_history.append(TradeRecord(
        timestamp=now.isoformat(),
        side=order.side,
        symbol=order.symbol,
        shares=order.shares,
        price=fill_price,
        is_day_trade=is_day_trade,
    ))


class DryRunBroker:
    """Paper execution. Fills at the decision-time reference price."""

    name = "dry_run"

    def execute(self, order: Order, state: State, now: datetime) -> dict:
        _apply_fill(state, order, order.price, now)
        return {"status": "simulated", "fill_price": order.price}


class RobinhoodMCPBroker:
    """Live execution via the Robinhood MCP server.

    WIRING (do this in your LOCAL Claude Code session, not the cloud one):

      1. In your local session, run `/mcp` and confirm robinhood-trading is
         connected, then ask Claude to list its tools. You're looking for the
         order-placement tool and its parameters (symbol, side, quantity or
         notional, order type). Names vary by server version.

      2. Implement `_place_order` below to call that tool and return the actual
         fill price (or the order id, then poll for the fill).

      3. Keep `mode: dry_run` until you have placed ONE tiny manual test order
         through the tool by hand and confirmed it behaves.

    Until _place_order is implemented, execute() raises — so flipping to
    mode: live without doing the wiring fails safe instead of silently doing
    nothing or, worse, something wrong.
    """

    name = "robinhood_mcp"

    def execute(self, order: Order, state: State, now: datetime) -> dict:
        fill_price = self._place_order(order)
        _apply_fill(state, order, fill_price, now)
        return {"status": "filled", "fill_price": fill_price}

    def _place_order(self, order: Order) -> float:
        raise NotImplementedError(
            "RobinhoodMCPBroker is not wired up yet. Implement _place_order to "
            "call the Robinhood MCP order tool from your local Claude Code "
            "session. See the class docstring. Refusing to trade real money "
            "with an unimplemented adapter."
        )


def make_broker(mode: str):
    return RobinhoodMCPBroker() if mode == "live" else DryRunBroker()
