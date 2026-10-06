"""Congress-trade mirroring strategy (e.g. "track Nancy Pelosi's trades").

Pulls STOCK Act periodic transaction disclosures (free House Stock Watcher
dataset, sourced from official filings) and builds a target portfolio of the
stocks a given member has most recently disclosed BUYING and not since sold.

Hard truths this strategy lives with (see README):
  * Disclosures lag the actual trade by up to ~45 days — you are never early.
  * Members often trade long-dated CALL OPTIONS; this equities-only account can
    only buy the underlying shares, a lower-leverage approximation.
  * Trades are sporadic and concentrated — the target set may be tiny or empty.

Like bot/strategy.py, this only proposes a TARGET portfolio. bot/risk.py turns
targets into allowed orders and bot/broker.py executes them.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

import requests

from .config import CongressConfig

# Disclosure "type" values vary by feed ("Purchase", "purchase", "Sale (Full)",
# "sale_full", "Sale", ...), so we match on substrings rather than exact tokens.
_INVALID_TICKERS = {"", "--", "n/a", "none", None}


def _member_name(txn: dict) -> str:
    """Filer name — House feeds use 'representative', Senate feeds use 'senator'."""
    return str(txn.get("representative") or txn.get("senator") or "")


def feed_latest_disclosure(transactions: list[dict]) -> date | None:
    """Most recent disclosure/transaction date across the whole feed.

    Used as a freshness signal: if the entire feed hasn't updated in weeks, the
    data mirror is probably broken and we must not trade on a frozen snapshot.
    """
    dates = [
        _parse_date(t.get("disclosure_date") or t.get("transaction_date"))
        for t in transactions
    ]
    dates = [d for d in dates if d]
    return max(dates) if dates else None


@dataclass
class CongressPick:
    ticker: str
    last_action: str          # "purchase" | "sale"
    last_date: date
    is_option: bool
    is_call: bool = False


def fetch_transactions(url: str) -> list[dict]:
    resp = requests.get(url, timeout=45)
    resp.raise_for_status()
    return resp.json()


def _parse_date(value: str) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def _is_option(txn: dict) -> tuple[bool, bool]:
    """Return (is_option, is_call). Puts (bearish) can't be mirrored long."""
    desc = f"{txn.get('asset_description', '')} {txn.get('asset_type', '')}".lower()
    is_option = "option" in desc or " call" in desc or " put" in desc
    is_call = "call" in desc
    is_put = "put" in desc
    # A put is an option but not a bullish/call one.
    return is_option, (is_call and not is_put)


def member_picks(
    transactions: list[dict], cfg: CongressConfig, today: date | None = None
) -> list[CongressPick]:
    """Tickers the member most-recently BOUGHT (and not since sold), newest first.

    A ticker is a target if, within the lookback window, its latest transaction
    is a bullish purchase (a stock buy, or a call-option buy when enabled) rather
    than a sale.
    """
    today = today or datetime.now().date()
    member = cfg.member.lower()

    latest: dict[str, CongressPick] = {}
    for txn in transactions:
        if member not in _member_name(txn).lower():
            continue
        ticker = str(txn.get("ticker", "")).strip().upper()
        if ticker.lower() in _INVALID_TICKERS:
            continue
        tdate = _parse_date(txn.get("transaction_date") or txn.get("disclosure_date"))
        if not tdate or (today - tdate).days > cfg.lookback_days or tdate > today:
            continue
        ttype = str(txn.get("type", "")).lower()

        is_option, is_call = _is_option(txn)
        if "purchase" in ttype:
            action = "purchase"
        elif "sale" in ttype:
            action = "sale"
        else:
            continue  # exchanges / unknown -> ignore

        # Keep only the most recent action per ticker.
        prev = latest.get(ticker)
        if prev is None or tdate >= prev.last_date:
            latest[ticker] = CongressPick(ticker, action, tdate, is_option)
            latest[ticker].is_call = is_call  # type: ignore[attr-defined]

    picks: list[CongressPick] = []
    for p in latest.values():
        if p.last_action != "purchase":
            continue
        is_call = getattr(p, "is_call", False)
        is_put_option = p.is_option and not is_call
        if is_put_option:
            continue  # bearish position we can't mirror on a long-only account
        if p.is_option and not cfg.include_call_options:
            continue
        picks.append(p)

    picks.sort(key=lambda p: p.last_date, reverse=True)
    return picks[: cfg.top_n]


def target_weights(picks: list[CongressPick]) -> dict[str, float]:
    """Equal-weight the selected tickers."""
    if not picks:
        return {}
    w = 1.0 / len(picks)
    return {p.ticker: w for p in picks}
