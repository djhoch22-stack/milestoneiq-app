"""Persistent bot state: cash, positions, equity high-water mark, trade history.

State is the bot's memory between scheduled runs. It is stored as JSON so you
can read and audit it by hand at any time.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from pathlib import Path


@dataclass
class Position:
    symbol: str
    shares: float
    avg_price: float          # average cost basis
    high_price: float         # highest close seen since opening (for trailing stop)
    opened_at: str            # ISO timestamp


@dataclass
class TradeRecord:
    timestamp: str            # ISO timestamp
    side: str                 # "buy" | "sell"
    symbol: str
    shares: float
    price: float
    is_day_trade: bool        # bought and sold same day -> counts toward PDT


@dataclass
class State:
    cash: float
    positions: dict[str, Position] = field(default_factory=dict)
    equity_high_water_mark: float = 0.0
    halted: bool = False       # set True when the drawdown kill switch fires
    halted_reason: str = ""
    trade_history: list[TradeRecord] = field(default_factory=list)
    last_run: str = ""

    # ── persistence ──────────────────────────────────────────────────────────
    @classmethod
    def load_or_create(cls, path: Path, starting_cash: float) -> "State":
        if path.exists():
            with open(path) as f:
                raw = json.load(f)
            return cls(
                cash=raw["cash"],
                positions={
                    s: Position(**p) for s, p in raw.get("positions", {}).items()
                },
                equity_high_water_mark=raw.get("equity_high_water_mark", 0.0),
                halted=raw.get("halted", False),
                halted_reason=raw.get("halted_reason", ""),
                trade_history=[TradeRecord(**t) for t in raw.get("trade_history", [])],
                last_run=raw.get("last_run", ""),
            )
        return cls(cash=starting_cash, equity_high_water_mark=starting_cash)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "cash": self.cash,
            "positions": {s: asdict(p) for s, p in self.positions.items()},
            "equity_high_water_mark": self.equity_high_water_mark,
            "halted": self.halted,
            "halted_reason": self.halted_reason,
            "trade_history": [asdict(t) for t in self.trade_history],
            "last_run": self.last_run,
        }
        tmp = path.with_suffix(path.suffix + ".tmp")
        with open(tmp, "w") as f:
            json.dump(data, f, indent=2)
        tmp.replace(path)  # atomic write — never leaves a half-written state file

    # ── helpers ──────────────────────────────────────────────────────────────
    def equity(self, prices: dict[str, float]) -> float:
        """Total account value = cash + market value of all positions."""
        holdings = sum(
            p.shares * prices.get(s, p.avg_price) for s, p in self.positions.items()
        )
        return self.cash + holdings

    def day_trades_in_last_5_sessions(self, today: date | None = None) -> int:
        """Count day trades in the trailing ~5 business days, for PDT checks.

        A day trade is recorded when a position is opened and (partly) closed on
        the same calendar day; see RiskEngine. We approximate the 5-session
        window with the last 7 calendar days, which is conservative (counts a
        little more, never less).
        """
        today = today or datetime.now().date()
        count = 0
        for t in self.trade_history:
            if not t.is_day_trade:
                continue
            ts = datetime.fromisoformat(t.timestamp).date()
            if (today - ts).days <= 7:
                count += 1
        return count
