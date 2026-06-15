"""Deterministic risk engine.

This is the safety core. It takes the strategy's *target* portfolio plus the
current account state and prices, and returns the concrete list of orders that
are ALLOWED to be placed. Every protective rule lives here, in plain code:

  * drawdown kill switch (liquidate + halt)
  * per-position trailing stop-loss
  * max position size
  * minimum cash buffer
  * Pattern Day Trader (PDT) trade throttling
  * max orders per run circuit breaker

None of this depends on AI judgment. If the strategy goes haywire, these limits
still hold.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .config import RiskConfig
from .state import Position, State

MIN_ORDER_NOTIONAL = 1.00     # don't bother with sub-$1 dust orders
SHARE_PRECISION = 4           # Robinhood supports fractional shares


@dataclass
class Order:
    side: str       # "buy" | "sell"
    symbol: str
    shares: float
    price: float    # reference price at decision time (for sizing/logging)
    reason: str     # human-readable why, recorded to the audit log

    @property
    def notional(self) -> float:
        return self.shares * self.price


class RiskEngine:
    def __init__(self, cfg: RiskConfig):
        self.cfg = cfg

    def decide(
        self,
        state: State,
        prices: dict[str, float],
        target_weights: dict[str, float],
        now: datetime | None = None,
    ) -> list[Order]:
        now = now or datetime.now()
        equity = state.equity(prices)

        # Update the all-time-high water mark used by the drawdown kill switch.
        state.equity_high_water_mark = max(state.equity_high_water_mark, equity)

        # 1) DRAWDOWN KILL SWITCH — overrides everything else.
        floor = state.equity_high_water_mark * (1 - self.cfg.max_drawdown_kill_pct)
        if equity <= floor and state.positions:
            state.halted = True
            state.halted_reason = (
                f"Drawdown kill switch: equity ${equity:,.2f} fell to/below "
                f"${floor:,.2f} ({self.cfg.max_drawdown_kill_pct:.0%} below high "
                f"of ${state.equity_high_water_mark:,.2f}). Liquidating and halting."
            )
            return self._liquidate_all(state, prices, reason="drawdown kill switch")

        if state.halted:
            return []  # halted accounts make no trades until manually re-enabled

        orders: list[Order] = []
        day_trades_used = state.day_trades_in_last_5_sessions(now.date())

        # 2) TRAILING STOP-LOSS — refresh high-water price, sell breached names.
        forced_exits: set[str] = set()
        for symbol, pos in state.positions.items():
            price = prices.get(symbol)
            if price is None:
                continue
            pos.high_price = max(pos.high_price, price)
            stop = pos.high_price * (1 - self.cfg.trailing_stop_pct)
            if price <= stop:
                orders.append(Order(
                    side="sell", symbol=symbol, shares=pos.shares, price=price,
                    reason=(f"trailing stop hit: {price:.2f} <= {stop:.2f} "
                            f"({self.cfg.trailing_stop_pct:.0%} off high "
                            f"{pos.high_price:.2f})"),
                ))
                forced_exits.add(symbol)

        # 3) REBALANCE toward target weights (skip names already being stopped out).
        target_equity = equity * (1 - self.cfg.min_cash_pct)
        capped_weights = self._cap_weights(target_weights)

        # 3a) Sell positions that are not in the target (or trim overweight ones).
        for symbol, pos in state.positions.items():
            if symbol in forced_exits:
                continue
            price = prices.get(symbol, pos.avg_price)
            target_value = capped_weights.get(symbol, 0.0) * target_equity
            current_value = pos.shares * price
            excess = current_value - target_value
            if excess > MIN_ORDER_NOTIONAL:
                shares = self._round_shares(min(excess, current_value) / price)
                if shares > 0:
                    orders.append(Order(
                        side="sell", symbol=symbol, shares=shares, price=price,
                        reason=("exit position" if symbol not in capped_weights
                                else "trim to target weight"),
                    ))

        # 3b) Buy/extend toward target weights.
        for symbol, weight in capped_weights.items():
            price = prices.get(symbol)
            if price is None:
                continue
            pos = state.positions.get(symbol)
            current_value = pos.shares * price if pos else 0.0
            target_value = weight * target_equity
            shortfall = target_value - current_value
            if shortfall > MIN_ORDER_NOTIONAL:
                shares = self._round_shares(shortfall / price)
                if shares > 0:
                    orders.append(Order(
                        side="buy", symbol=symbol, shares=shares, price=price,
                        reason="build to target weight",
                    ))

        # 4) Apply PDT throttle, cash constraint, and per-run cap.
        orders = self._apply_pdt_limit(orders, state, day_trades_used, now)
        orders = self._apply_cash_constraint(orders, state)
        if len(orders) > self.cfg.max_orders_per_run:
            # Keep sells (risk-reducing) first, then the highest-conviction buys.
            sells = [o for o in orders if o.side == "sell"]
            buys = [o for o in orders if o.side == "buy"]
            orders = (sells + buys)[: self.cfg.max_orders_per_run]
        return orders

    # ── internals ─────────────────────────────────────────────────────────────
    def _cap_weights(self, weights: dict[str, float]) -> dict[str, float]:
        return {s: min(w, self.cfg.max_position_pct) for s, w in weights.items()}

    def _round_shares(self, shares: float) -> float:
        return max(0.0, round(shares, SHARE_PRECISION))

    def _liquidate_all(
        self, state: State, prices: dict[str, float], reason: str
    ) -> list[Order]:
        return [
            Order(side="sell", symbol=s, shares=p.shares,
                  price=prices.get(s, p.avg_price), reason=reason)
            for s, p in state.positions.items() if p.shares > 0
        ]

    def _is_day_trade(self, order: Order, state: State, now: datetime) -> bool:
        """A sell is a day trade if the position was opened today."""
        if order.side != "sell":
            return False
        pos = state.positions.get(order.symbol)
        if not pos:
            return False
        return datetime.fromisoformat(pos.opened_at).date() == now.date()

    def _apply_pdt_limit(
        self, orders: list[Order], state: State, used: int, now: datetime
    ) -> list[Order]:
        budget = self.cfg.max_day_trades_per_5d - used
        kept: list[Order] = []
        for o in orders:
            if self._is_day_trade(o, state, now):
                if budget <= 0:
                    o.reason += " [SKIPPED: would exceed PDT day-trade limit]"
                    continue
                budget -= 1
            kept.append(o)
        return [o for o in kept if "[SKIPPED" not in o.reason]

    def _apply_cash_constraint(
        self, orders: list[Order], state: State
    ) -> list[Order]:
        """Never spend cash we don't have. Sells free up cash for later buys."""
        available = state.cash
        for o in orders:
            if o.side == "sell":
                available += o.notional
        kept: list[Order] = []
        for o in orders:
            if o.side == "buy":
                if o.notional > available:
                    affordable = self._round_shares(available / o.price)
                    if affordable * o.price < MIN_ORDER_NOTIONAL:
                        continue
                    o.shares = affordable
                    o.reason += " [reduced to fit available cash]"
                available -= o.notional
            kept.append(o)
        return kept
