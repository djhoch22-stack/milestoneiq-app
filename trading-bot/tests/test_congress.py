"""Tests for the congress-mirroring strategy (no network — synthetic records)."""
from __future__ import annotations

import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.config import CongressConfig
from bot.congress import member_picks, target_weights


def cfg(**kw):
    base = dict(member="Pelosi", lookback_days=365, top_n=5,
                data_url="x", include_call_options=True)
    base.update(kw)
    return CongressConfig(**base)


def txn(rep, ticker, ttype, tdate, desc="", asset_type="stock"):
    return {"representative": rep, "ticker": ticker, "type": ttype,
            "transaction_date": tdate, "asset_description": desc,
            "asset_type": asset_type}


TODAY = date(2026, 6, 15)


def test_recent_purchase_becomes_target():
    txns = [txn("Hon. Nancy Pelosi", "NVDA", "purchase", "2026-05-01")]
    picks = member_picks(txns, cfg(), TODAY)
    assert [p.ticker for p in picks] == ["NVDA"]
    assert target_weights(picks) == {"NVDA": 1.0}


def test_sale_after_purchase_excludes_ticker():
    txns = [
        txn("Hon. Nancy Pelosi", "AAPL", "purchase", "2026-01-10"),
        txn("Hon. Nancy Pelosi", "AAPL", "sale_full", "2026-05-10"),
    ]
    assert member_picks(txns, cfg(), TODAY) == []


def test_other_members_ignored():
    txns = [txn("Hon. Someone Else", "TSLA", "purchase", "2026-05-01")]
    assert member_picks(txns, cfg(), TODAY) == []


def test_beyond_lookback_excluded():
    txns = [txn("Hon. Nancy Pelosi", "MSFT", "purchase", "2024-01-01")]
    assert member_picks(txns, cfg(lookback_days=365), TODAY) == []


def test_invalid_ticker_skipped():
    txns = [txn("Hon. Nancy Pelosi", "--", "purchase", "2026-05-01")]
    assert member_picks(txns, cfg(), TODAY) == []


def test_put_option_skipped_calls_included():
    txns = [
        txn("Hon. Nancy Pelosi", "GOOGL", "purchase", "2026-05-01",
            desc="Alphabet Inc Call options"),
        txn("Hon. Nancy Pelosi", "META", "purchase", "2026-05-02",
            desc="Meta Put options"),
    ]
    picks = member_picks(txns, cfg(), TODAY)
    tickers = {p.ticker for p in picks}
    assert "GOOGL" in tickers  # bullish call -> mirror underlying
    assert "META" not in tickers  # bearish put -> can't mirror long


def test_calls_excluded_when_disabled():
    txns = [txn("Hon. Nancy Pelosi", "GOOGL", "purchase", "2026-05-01",
                desc="Alphabet Inc Call options")]
    assert member_picks(txns, cfg(include_call_options=False), TODAY) == []


def test_top_n_limits_and_newest_first():
    txns = [
        txn("Hon. Nancy Pelosi", "AAA", "purchase", "2026-01-01"),
        txn("Hon. Nancy Pelosi", "BBB", "purchase", "2026-03-01"),
        txn("Hon. Nancy Pelosi", "CCC", "purchase", "2026-05-01"),
    ]
    picks = member_picks(txns, cfg(top_n=2), TODAY)
    assert [p.ticker for p in picks] == ["CCC", "BBB"]  # newest first, capped


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} tests passed")
