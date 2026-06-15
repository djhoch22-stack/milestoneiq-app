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

## Going live (Path B — standalone, fully automated)

Execution runs as deterministic Python (no LLM in the money path) via a built-in
MCP client ([`bot/mcp_client.py`](bot/mcp_client.py)) that talks directly to the
Robinhood server. It trades **only** the agentic-allowed account you configure —
a hard brokerage boundary that keeps your other accounts untouchable.

**Reconciliation:** at the start of every live run the bot calls `get_portfolio`
and `get_equity_positions` and overwrites its local cash/positions with the
broker's truth, so it can never trade on stale state. If that sync fails, the run
aborts without trading. A real fill is recorded only after polling
`get_equity_orders` confirms a `filled` state — orders that error or stay
unconfirmed record no position.

> The MCP client and the tool request/response parsing **could not be tested in
> the environment they were written in** (no Robinhood access there). That's why
> you go live through the staged gates below, on your own machine, smallest risk
> first. Do not skip them.

**Prep**

1. Install the live dependency: `pip install "mcp>=1.2"` (already in
   `requirements.txt`).
2. Find your agentic account number (the only `agentic_allowed=true` account)
   and set `execution.account_number` in `config.yaml`.
3. Set `mode: live`. Leave `execution.test_mode_max_notional: 2.00` for now — it
   caps **every** order at $2 regardless of anything else.

**Gate 1 — review-only (places nothing, proves auth + plumbing)**

```bash
python run.py --review-only
```

This runs the full plan and calls `review_equity_order` for each order but
places **zero** orders. The first run opens your browser once to authorize
(tokens cache to `data/mcp_tokens.json`; later runs are non-interactive). Check
`data/audit.jsonl` for the `review_response` entries — and **send them to Claude
so the alert/fill parsers can be confirmed against real responses.**

**Gate 2 — tiny real orders ($2 clamp)**

With `test_mode_max_notional: 2.00` still set, run a normal pass:

```bash
python run.py
```

Each buy is resized down to ~$2 (so a few ~$2 orders, well under $10 total),
placed for real, then polled for the fill. Confirm in the Robinhood app that
they executed and that `state.json` recorded the real fill prices. This proves
place + poll + fill accounting end to end on real—but tiny—orders.

**Gate 3 — full automation**

Only after gates 1–2 pass cleanly:

1. Set `test_mode_max_notional: 0` (disables the $2 cap; `max_order_notional`
   still applies as the backstop).
2. Schedule it with `com.user.tradingbot.plist.example` (see above).
3. Watch the first few automated runs and the audit log closely.

Keep the position/drawdown limits tight until you've seen it behave across at
least a few sessions.

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
