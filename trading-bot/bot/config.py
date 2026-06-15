"""Configuration loading and validation.

Fails loudly on bad config rather than silently trading with wrong limits.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class StrategyConfig:
    watchlist: list[str]
    lookback_days: int
    top_n: int
    trend_filter_sma_days: int


@dataclass
class RiskConfig:
    max_position_pct: float
    min_cash_pct: float
    trailing_stop_pct: float
    max_drawdown_kill_pct: float
    max_day_trades_per_5d: int
    max_orders_per_run: int


@dataclass
class Config:
    mode: str
    starting_cash: float
    strategy: StrategyConfig
    risk: RiskConfig
    state_file: Path
    audit_log: Path
    kill_switch_file: Path
    base_dir: Path = field(default_factory=Path.cwd)

    @property
    def is_live(self) -> bool:
        return self.mode == "live"


def load_config(path: str | os.PathLike) -> Config:
    path = Path(path)
    base_dir = path.resolve().parent
    with open(path) as f:
        raw = yaml.safe_load(f)

    mode = raw.get("mode", "dry_run")
    if mode not in ("dry_run", "live"):
        raise ValueError(f"mode must be 'dry_run' or 'live', got {mode!r}")

    strat = raw["strategy"]
    risk = raw["risk"]
    paths = raw["paths"]

    watchlist = [s.strip().upper() for s in strat["watchlist"]]
    if not watchlist:
        raise ValueError("strategy.watchlist must not be empty")
    if strat["top_n"] < 1:
        raise ValueError("strategy.top_n must be >= 1")

    for k in ("max_position_pct", "min_cash_pct", "trailing_stop_pct",
              "max_drawdown_kill_pct"):
        v = float(risk[k])
        if not 0 < v < 1:
            raise ValueError(f"risk.{k} must be between 0 and 1, got {v}")

    return Config(
        mode=mode,
        starting_cash=float(raw["starting_cash"]),
        strategy=StrategyConfig(
            watchlist=watchlist,
            lookback_days=int(strat["lookback_days"]),
            top_n=int(strat["top_n"]),
            trend_filter_sma_days=int(strat["trend_filter_sma_days"]),
        ),
        risk=RiskConfig(
            max_position_pct=float(risk["max_position_pct"]),
            min_cash_pct=float(risk["min_cash_pct"]),
            trailing_stop_pct=float(risk["trailing_stop_pct"]),
            max_drawdown_kill_pct=float(risk["max_drawdown_kill_pct"]),
            max_day_trades_per_5d=int(risk["max_day_trades_per_5d"]),
            max_orders_per_run=int(risk["max_orders_per_run"]),
        ),
        state_file=base_dir / paths["state_file"],
        audit_log=base_dir / paths["audit_log"],
        kill_switch_file=base_dir / raw["kill_switch_file"],
        base_dir=base_dir,
    )
