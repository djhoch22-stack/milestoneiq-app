# Aggressive-momentum trading bot

An autonomous trading bot that ranks a watchlist by momentum, holds the top few
names in a confirmed uptrend, and rebalances on a schedule — with deterministic,
code-enforced risk limits and a hard drawdown kill switch.

It is built to run on your **own machine**, against the Robinhood account you
connected via the `robinhood-trading` MCP server.

> ⚠️ **Read this whole file before you let it trade real money.** It ships in
> `dry_run` mode on purpose. Real-money execution is deliberately left unwired
> until you complete the steps in [Going live](#going-live).

---

## Honest expectations (please read)

- **Your target is 15%/year. That is a *goal*, not a guarantee.** The broad
  market averages ~10%/year over the long run, with down years mixed in.
  Momentum strategies can beat that in trending markets and can *underperform*
  or lose money in choppy/reversing ones. No code can promise a return.
- **Your downside is the full $1,000.** You told me you're okay with that. The
  drawdown kill switch is there to stop a total wipeout, not to prevent losses.
- **Small accounts have real headwinds:** the Pattern Day Trader rule (under
  $25k = max 3 day trades / 5 business days) and bid/ask spreads. The bot is
  designed around these — it trades on a slow cadence, not intraday.
- **This was built and unit-tested, but its live order execution could not be
  tested from the environment it was written in** (no brokerage access there).
  That is exactly why live execution is unwired and why you must validate in
  `dry_run` first, then with one tiny manual order. Treat the first live runs
  as a supervised experiment.

---

## How it works

```
  watchlist ──► strategy.py ──► target portfolio (top-N momentum, uptrend only)
                                       │
                                       ▼
   account state ──────────────► risk.py ──► allowed orders
                                       │      (stop-loss, max position, min cash,
                                       │       PDT throttle, drawdown kill switch,
                                       │       max orders/run)
                                       ▼
                                  broker.py ──► dry_run (simulate)  OR
                                                live    (Robinhood MCP)
                                       │
                                       ▼
                            state.json  +  audit.jsonl
```

The **strategy** only proposes what it *wants* to hold. The **risk engine** is a
separate layer that decides what's actually *allowed* — in plain code, not by any
AI judgment. If the strategy ever misbehaves, the risk limits still hold.

---

## Setup

```bash
cd trading-bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp config.example.yaml config.yaml      # config.yaml is gitignored
```

Open `config.yaml` and review every value. The defaults are deliberately
conservative for a $1,000 account. Key knobs:

| Setting | Default | What it does |
|---|---|---|
| `mode` | `dry_run` | `dry_run` simulates; `live` places real orders |
| `starting_cash` | `1000` | The hard ceiling of money the bot manages |
| `strategy.top_n` | `3` | How many names to hold (fewer = more aggressive) |
| `risk.trailing_stop_pct` | `0.08` | Per-position trailing stop |
| `risk.max_drawdown_kill_pct` | `0.15` | Liquidate + halt if equity falls this far from its high |
| `risk.max_day_trades_per_5d` | `2` | PDT safety margin (legal limit is 3) |

---

## Run it (dry run — no real money)

```bash
python run.py            # one decision pass; simulates fills, logs everything
python run.py --status   # just print current state, no trading
```

Each run prints what it sees and what it would do, then writes:

- `data/state.json`  — current cash, positions, high-water mark (human-readable)
- `data/audit.jsonl` — append-only log of every signal and order

**Let it run in dry-run for a few weeks.** Watch the audit log. Make sure the
decisions make sense to you before risking a cent.

### Schedule it

Use the included `com.user.tradingbot.plist.example` (macOS launchd) to run it
automatically each weekday morning. Edit the paths inside, then:

```bash
cp com.user.tradingbot.plist.example ~/Library/LaunchAgents/com.user.tradingbot.plist
launchctl load ~/Library/LaunchAgents/com.user.tradingbot.plist
```

Your Mac must be awake when the schedule fires.

---

## Emergency stop

Two independent stops:

1. **Kill-switch file** — instantly pause all trading:
   ```bash
   touch trading-bot/STOP      # bot places no orders while this exists
   rm trading-bot/STOP         # resume
   ```
2. **Drawdown kill switch** — automatic. If equity drops `max_drawdown_kill_pct`
   below its all-time high, the bot sells everything to cash and sets
   `halted: true` in `state.json`. It will not trade again until you manually set
   `halted` back to `false` after reviewing what happened.

---

## Going live

Do **not** skip the dry-run period. When you're ready:

1. **Wire the execution adapter.** In your **local** Claude Code session (where
   the Robinhood tools are actually connected — not the cloud one):
   - Run `/mcp`, confirm `robinhood-trading` is `connected`.
   - Ask Claude to list the server's tools and find the **order-placement** tool
     and its exact parameters (symbol, side, quantity/notional, order type).
   - Implement `_place_order()` in [`bot/broker.py`](bot/broker.py) to call that
     tool and return the real fill price. It currently raises `NotImplementedError`
     on purpose, so flipping to `live` without wiring fails safe.
2. **Place ONE tiny test order by hand** through the MCP tool (e.g. $1–$5) to
   confirm the tool works and you understand its behavior.
3. **Set `mode: live`** in `config.yaml`, keep `starting_cash` at your real
   amount, and run a single pass while watching it.
4. Keep the position/drawdown limits tight until you trust it.

---

## Layout

```
trading-bot/
├── config.example.yaml      # copy to config.yaml and edit
├── requirements.txt
├── run.py                   # entry point — one scheduled decision pass
├── com.user.tradingbot.plist.example   # macOS scheduler
├── bot/
│   ├── config.py            # config loading + validation
│   ├── strategy.py          # momentum signals + target portfolio
│   ├── risk.py              # deterministic risk limits (the safety core)
│   ├── broker.py            # dry-run + Robinhood MCP (stub) execution
│   ├── state.py             # persistent cash/positions/history
│   └── audit.py             # append-only JSONL audit log
└── tests/
    └── test_risk.py         # safety-engine tests (no network needed)
```

Run the safety tests anytime with:

```bash
python tests/test_risk.py
```

---

**This is not financial advice. You are responsible for every trade this bot
makes. Markets can and do go down. Only risk money you can afford to lose.**
