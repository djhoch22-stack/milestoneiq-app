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

import json
import time
from datetime import datetime
from uuid import uuid4

from .risk import MIN_ORDER_NOTIONAL, SHARE_PRECISION, Order
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


# Words in a review/order response that mean "do not proceed".
_BLOCKING_TOKENS = ("reject", "blocked", "halt", "insufficient", "not_allowed",
                    "ineligible", "error")


def _body(resp) -> dict:
    """Unwrap Robinhood's {"data": {...}, "guide": ...} envelope.

    The tools return the real payload under a top-level "data" key. Fall back to
    the response itself if it isn't wrapped, so the parsers work either way.
    """
    if isinstance(resp, dict) and isinstance(resp.get("data"), (dict, list)):
        return resp["data"]
    return resp if isinstance(resp, dict) else {}


def _order_obj(resp) -> dict:
    """Pull the order object out of a response.

    Place returns {"data": {"order": {...}}}; get_equity_orders single-order may
    return {"data": {"order": {...}}} or {"data": {"orders": [{...}]}}. Review
    returns the order fields directly under data. This normalizes all of them.
    """
    body = _body(resp)
    if isinstance(body, dict):
        if isinstance(body.get("order"), dict):
            return body["order"]
        orders = body.get("orders") or body.get("results")
        if isinstance(orders, list) and orders:
            return orders[0]
    return body if isinstance(body, dict) else {}


class RobinhoodMCPBroker:
    """Live execution via the Robinhood MCP server: review -> place -> poll fill.

    Order placement goes through `call_tool(name, arguments) -> dict`, which is
    injected (the real Robinhood MCP client, or a fake in tests). Every order is
    market type, regular hours, on the configured agentic account. Safety caps
    (max_order_notional and the staged test_mode_max_notional) are enforced here,
    independent of the strategy/risk math, as a last-resort backstop.

    ⚠️ The exact response shapes of the Robinhood tools could not be verified
    where this was written. The parsers below are defensive and log raw
    responses to the audit trail. Run `--review-only` first and share the output
    so the alert/fill parsing can be confirmed against real responses.
    """

    name = "robinhood_mcp"

    def __init__(self, call_tool, account_number: str, *, review_first: bool = True,
                 poll_attempts: int = 10, poll_interval: float = 3.0,
                 max_order_notional: float = 450.0, test_mode_max_notional: float = 0.0,
                 review_only: bool = False, audit=None):
        self.call_tool = call_tool
        self.account_number = account_number
        self.review_first = review_first
        self.poll_attempts = poll_attempts
        self.poll_interval = poll_interval
        self.max_order_notional = max_order_notional
        self.test_mode_max_notional = test_mode_max_notional
        self.review_only = review_only
        self.audit = audit

    def _log(self, event: str, **fields):
        if self.audit:
            self.audit.write(event, **fields)

    def _base_args(self, order: Order) -> dict:
        return {
            "account_number": self.account_number,
            "symbol": order.symbol,
            "side": order.side,
            "type": "market",
            "quantity": f"{order.shares:.4f}",
            "time_in_force": "gfd",
            "market_hours": "regular_hours",
        }

    @staticmethod
    def _is_blocked(resp: dict) -> str | None:
        """Return a reason string if the response indicates we must not proceed.

        Catches, in order: tool errors (isError / non-JSON error bodies like
        "API error 400: ..."), explicit error fields, blocking pre-trade alerts
        under `order_checks` (empty {} = none), and rejected order states.
        A non-empty alert blocks only if it contains a blocking token; otherwise
        it's noted (the full response is in the audit log) and we proceed.
        """
        if not isinstance(resp, dict):
            return f"unexpected response type: {type(resp).__name__}"
        if resp.get("isError"):
            return f"tool returned isError: {resp.get('_text', resp)}"
        # Error bodies aren't valid JSON, so they arrive as {"_text": ...}.
        if resp.get("_text"):
            return f"error response: {str(resp['_text'])[:200]}"
        body = _body(resp)
        if isinstance(body, dict) and body.get("non_field_errors"):
            return f"order error: {body['non_field_errors']}"
        alerts = (body.get("order_checks") or body.get("alerts")
                  or body.get("pre_trade_alerts") or resp.get("alerts") or {}) \
            if isinstance(body, dict) else {}
        if alerts:
            alert_blob = json.dumps(alerts).lower()
            if any(tok in alert_blob for tok in _BLOCKING_TOKENS):
                return f"blocking pre-trade alert: {alerts}"
        state = str(_order_obj(resp).get("state", "")).lower()
        if state in ("rejected", "failed", "cancelled", "voided"):
            return f"order state is {state!r}"
        return None

    def execute(self, order: Order, state: State, now: datetime) -> dict:
        # Staged testing: resize the order DOWN to the test cap (don't refuse it),
        # so the first real orders are deliberately tiny but still exercise the
        # full place/poll/fill path. Sells of an existing position are left whole
        # (you can't sell a fraction you don't hold meaningfully for a test).
        if (self.test_mode_max_notional > 0 and order.side == "buy"
                and order.notional > self.test_mode_max_notional):
            clamped = round(self.test_mode_max_notional / order.price, SHARE_PRECISION)
            self._log("order_clamped_for_test", symbol=order.symbol,
                      from_shares=order.shares, to_shares=clamped,
                      cap=self.test_mode_max_notional)
            order.shares = clamped

        # Hard backstop: refuse anything still above the absolute ceiling. With a
        # correct strategy on a $1k account this should never fire — if it does,
        # something is wrong and we'd rather place nothing.
        if order.notional > self.max_order_notional + 1e-9:
            self._log("order_refused", symbol=order.symbol, notional=order.notional,
                      cap=self.max_order_notional)
            return {"status": "refused",
                    "reason": f"notional ${order.notional:.2f} exceeds backstop "
                              f"${self.max_order_notional:.2f}"}
        if order.notional < MIN_ORDER_NOTIONAL:
            return {"status": "skipped",
                    "reason": f"notional ${order.notional:.2f} below minimum "
                              f"${MIN_ORDER_NOTIONAL:.2f}"}

        args = self._base_args(order)

        # 1) Review (pre-trade check). Always done in review-only mode.
        if self.review_first or self.review_only:
            review = self.call_tool("review_equity_order", args)
            self._log("review_response", symbol=order.symbol, side=order.side,
                      request=args, response=review)
            blocked = self._is_blocked(review)
            if blocked:
                return {"status": "skipped", "reason": blocked, "review": review}
            if self.review_only:
                return {"status": "review_only", "review": review}

        # 2) Place the real order (idempotent via ref_id).
        place_args = {**args, "ref_id": str(uuid4())}
        resp = self.call_tool("place_equity_order", place_args)
        self._log("place_response", symbol=order.symbol, request=place_args,
                  response=resp)
        blocked = self._is_blocked(resp)
        if blocked:
            return {"status": "rejected", "reason": blocked, "response": resp}

        order_obj = _order_obj(resp)
        order_id = (order_obj.get("id") or order_obj.get("order_id")
                    or order_obj.get("orderId"))
        if not order_id:
            # Order was accepted-shaped but we can't find an id to confirm it.
            # Do NOT record a fill we can't verify.
            self._log("fill_warning", symbol=order.symbol,
                      reason="no order id in place response; not recording a fill")
            return {"status": "pending", "reason": "no order id to confirm fill",
                    "response": resp}

        # 3) Poll for the actual fill. Only a confirmed fill updates state — we
        #    never assume/fabricate a fill, since that desyncs us from reality.
        fill_price, filled_qty = self._poll_fill(order_id, order)
        if fill_price is None:
            self._log("fill_warning", symbol=order.symbol, order_id=order_id,
                      reason="order not confirmed filled within poll window; "
                             "no position recorded — will reconcile next run")
            return {"status": "pending", "order_id": order_id,
                    "reason": "not confirmed filled within poll window"}

        if filled_qty and filled_qty > 0:
            order.shares = filled_qty
        _apply_fill(state, order, fill_price, now)
        return {"status": "filled", "fill_price": fill_price, "order_id": order_id,
                "shares": order.shares}

    def _poll_fill(self, order_id, order: Order) -> tuple[float | None, float | None]:
        """Return (fill_price, filled_qty), or (None, None) if no confirmed fill.

        Never falls back to a guessed price — an unconfirmed order returns None so
        the caller records no position rather than a fabricated one."""
        for _ in range(self.poll_attempts):
            resp = self.call_tool("get_equity_orders", {
                "account_number": self.account_number, "order_id": order_id,
            })
            o = _order_obj(resp)
            if str(o.get("state", "")).lower() == "filled":
                price, qty = self._extract_fill(o)
                if price:
                    return price, qty
            time.sleep(self.poll_interval)
        return None, None

    @staticmethod
    def _extract_fill(order_obj: dict) -> tuple[float | None, float | None]:
        # Prefer an explicit average price; otherwise average the executions.
        avg = order_obj.get("average_price") or order_obj.get("price")
        qty = order_obj.get("cumulative_quantity") or order_obj.get("filled_quantity")
        execs = order_obj.get("executions") or []
        if execs:
            total_q = sum(float(e.get("quantity", 0)) for e in execs)
            total_v = sum(float(e.get("quantity", 0)) * float(e.get("price", 0))
                          for e in execs)
            if total_q > 0:
                return total_v / total_q, total_q
        try:
            return (float(avg) if avg is not None else None,
                    float(qty) if qty is not None else None)
        except (TypeError, ValueError):
            return None, None


def make_broker(cfg, *, review_only: bool = False, audit=None):
    """Build the right broker for the config's mode.

    cfg is the full Config; mode/execution drive which broker is returned.
    """
    if cfg.mode != "live":
        return DryRunBroker()

    from .mcp_client import RobinhoodMCP
    token_file = cfg.state_file.parent / "mcp_tokens.json"
    client = RobinhoodMCP(cfg.execution.mcp_url, token_file)
    return RobinhoodMCPBroker(
        client.call_tool,
        cfg.execution.account_number,
        review_first=cfg.execution.review_first,
        poll_attempts=cfg.execution.poll_attempts,
        poll_interval=cfg.execution.poll_interval_seconds,
        max_order_notional=cfg.execution.max_order_notional,
        test_mode_max_notional=cfg.execution.test_mode_max_notional,
        review_only=review_only,
        audit=audit,
    )
