"""Aggressive-momentum strategy.

Ranks the watchlist by recent total return, keeps only names in a confirmed
uptrend (above their long SMA), and targets an equal-weight basket of the top N.

The strategy only proposes a TARGET portfolio. It does not place orders and is
unaware of risk limits — that separation is deliberate. bot/risk.py turns
targets into allowed orders; bot/broker.py executes them.
"""
from __future__ import annotations

import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
import yfinance as yf

from .config import StrategyConfig

# Isolate yfinance's timezone/cache SQLite in a per-user temp dir. The default
# shared cache can throw "database is locked" under concurrent/overlapping runs,
# which silently drops symbols from the ranking. A dedicated location avoids the
# lock contention.
try:
    _CACHE_DIR = Path(tempfile.gettempdir()) / "tradingbot_yf_cache"
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    yf.set_tz_cache_location(str(_CACHE_DIR))
except Exception:  # pragma: no cover - older yfinance without the setter
    pass


@dataclass
class Signal:
    symbol: str
    price: float          # latest close
    momentum: float       # total return over the lookback window (e.g. 0.12 = +12%)
    in_uptrend: bool      # price above the trend-filter SMA
    eligible: bool        # in_uptrend AND momentum > 0


def _download_closes(symbols: list[str], period_days: int) -> pd.DataFrame:
    data = yf.download(
        symbols,
        period=f"{period_days}d",
        interval="1d",
        auto_adjust=True,
        progress=False,
        threads=False,  # serial requests avoid the sqlite cache lock contention
    )
    closes = data["Close"]
    if isinstance(closes, pd.Series):  # single symbol -> Series; normalise to frame
        closes = closes.to_frame(name=symbols[0])
    return closes.dropna(how="all")


def fetch_prices(
    symbols: list[str], lookback_days: int, sma_days: int, retries: int = 3
) -> pd.DataFrame:
    """Daily closing prices, retrying for any symbols that fail to download.

    A transient fetch failure must not silently drop a symbol from the momentum
    ranking, so we re-request just the missing names a few times before giving
    up. run.py then logs whatever is still missing to the audit trail.
    """
    period_days = max(lookback_days, sma_days) + 40  # padding for non-trading days
    closes = _download_closes(symbols, period_days)

    for _ in range(retries):
        missing = [s for s in symbols
                   if s not in closes.columns or closes[s].dropna().empty]
        if not missing:
            break
        time.sleep(1.5)
        retry = _download_closes(missing, period_days)
        for s in retry.columns:
            closes[s] = retry[s]

    return closes.dropna(how="all")


def compute_signals(closes: pd.DataFrame, cfg: StrategyConfig) -> list[Signal]:
    signals: list[Signal] = []
    for symbol in closes.columns:
        series = closes[symbol].dropna()
        if len(series) < cfg.lookback_days + 1:
            continue  # not enough history to judge — skip rather than guess
        price = float(series.iloc[-1])
        past = float(series.iloc[-(cfg.lookback_days + 1)])
        momentum = (price / past) - 1.0
        sma = float(series.tail(cfg.trend_filter_sma_days).mean())
        in_uptrend = price > sma
        signals.append(Signal(
            symbol=symbol,
            price=price,
            momentum=momentum,
            in_uptrend=in_uptrend,
            eligible=in_uptrend and momentum > 0,
        ))
    return signals


def target_portfolio(signals: list[Signal], cfg: StrategyConfig) -> dict[str, float]:
    """Return {symbol: target_weight} for the top-N eligible names, equal weight.

    If fewer than top_n names are eligible, only those are held and the rest
    stays in cash (we never force exposure just to fill slots).
    """
    eligible = [s for s in signals if s.eligible]
    eligible.sort(key=lambda s: s.momentum, reverse=True)
    chosen = eligible[: cfg.top_n]
    if not chosen:
        return {}
    weight = 1.0 / len(chosen)
    return {s.symbol: weight for s in chosen}
