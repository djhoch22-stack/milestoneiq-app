#!/usr/bin/env python3
"""One-shot health check — why isn't the bot trading? Run on the machine the bot
runs on (it reads the local data/ files, which never leave that machine):

    python scripts/diagnose.py

Prints, in plain language: when it last ran, when it last actually traded, whether
it's aborting on Robinhood auth, whether a kill-switch or drawdown halt is active,
whether the launchd schedule is loaded, and the age of the Robinhood token file.
Read-only: it places no orders and changes nothing.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bot.config import load_config

LAUNCHD_LABEL = "com.user.tradingbot"


def _age(path: Path) -> str:
    if not path.exists():
        return "MISSING"
    secs = datetime.now().timestamp() - path.stat().st_mtime
    days, rem = divmod(int(secs), 86400)
    return f"{days}d {rem // 3600}h ago"


def _load_audit(path: Path, keep: int = 4000) -> list[dict]:
    if not path.exists():
        return []
    lines = path.read_text().splitlines()[-keep:]
    out = []
    for ln in lines:
        try:
            out.append(json.loads(ln))
        except json.JSONDecodeError:
            continue
    return out


def _last(events: list[dict], name: str) -> dict | None:
    for e in reversed(events):
        if e.get("event") == name:
            return e
    return None


def main() -> int:
    cfg_path = Path(__file__).resolve().parent.parent / "config.yaml"
    if not cfg_path.exists():
        print("config.yaml not found — nothing to diagnose."); return 2
    cfg = load_config(cfg_path)

    print("\n" + "=" * 60)
    print(f"  TRADING BOT HEALTH CHECK   ({datetime.now():%Y-%m-%d %H:%M})")
    print("=" * 60)
    print(f"  mode            : {cfg.mode}   strategy: {cfg.strategy.mode}")

    findings: list[str] = []

    # 1) Kill switch ----------------------------------------------------------
    if cfg.kill_switch_file.exists():
        print(f"\n  ⛔ KILL-SWITCH PRESENT: {cfg.kill_switch_file} "
              f"({_age(cfg.kill_switch_file)})")
        findings.append(f"Remove the kill-switch file to resume: rm {cfg.kill_switch_file}")
    else:
        print(f"\n  kill-switch     : none (good)")

    # 2) State ---------------------------------------------------------------
    sf = cfg.state_file
    if sf.exists():
        st = json.loads(sf.read_text())
        print(f"  state file      : {sf}  (updated {_age(sf)})")
        print(f"  last_run        : {st.get('last_run', 'never')}")
        print(f"  cash            : ${float(st.get('cash', 0)):,.2f}   "
              f"positions: {list((st.get('positions') or {}).keys()) or '(none)'}")
        if st.get("halted"):
            print(f"  ⛔ HALTED       : {st.get('halted_reason')}")
            findings.append("State is HALTED (drawdown kill). Review, then clear "
                            "'halted' in data/state.json to resume.")
    else:
        print(f"  state file      : MISSING ({sf}) — bot may never have run")

    # 3) Token file ----------------------------------------------------------
    tok = cfg.state_file.parent / "mcp_tokens.json"
    print(f"  robinhood token : {tok.name} {_age(tok)}")

    # 4) Audit trail ---------------------------------------------------------
    events = _load_audit(cfg.audit_log)
    if not events:
        print(f"\n  audit log       : empty/missing ({cfg.audit_log})")
        findings.append("No audit entries — the scheduler likely isn't running at "
                        "all. Check the launchd section below.")
    else:
        done = _last(events, "run_complete")
        last_order = _last(events, "order")
        recon_fail = _last(events, "reconcile_failed")
        print(f"\n  last run_complete : {done.get('ts') if done else 'NEVER'}")
        print(f"  last order placed : {last_order.get('ts') if last_order else 'NEVER'}"
              + (f"  ({last_order.get('side')} {last_order.get('symbol')})"
                 if last_order else ""))
        # Count reconcile failures in the trailing window.
        fails = sum(1 for e in events if e.get("event") == "reconcile_failed")
        if fails:
            print(f"  ⛔ reconcile_failed x{fails} (most recent): "
                  f"{(recon_fail or {}).get('error', '')[:160]}")
            findings.append("Runs are ABORTING at Robinhood reconciliation — almost "
                            "always an expired/deauthorized Robinhood token. Re-auth "
                            "interactively (see README), because headless launchd "
                            "runs can't open the browser to re-login.")
        print("\n  --- last 12 audit events ---")
        for e in events[-12:]:
            extra = e.get("error") or e.get("reason") or ""
            print(f"    {e.get('ts', '')[:19]}  {e.get('event'):<18} {str(extra)[:70]}")

    # 5) launchd -------------------------------------------------------------
    print("\n  --- launchd schedule ---")
    try:
        res = subprocess.run(["launchctl", "list", LAUNCHD_LABEL],
                             capture_output=True, text=True, timeout=10)
        if res.returncode == 0:
            print(f"  job '{LAUNCHD_LABEL}' is LOADED.")
            for ln in res.stdout.splitlines():
                if '"LastExitStatus"' in ln or '"PID"' in ln:
                    print("   " + ln.strip())
        else:
            print(f"  ⛔ job '{LAUNCHD_LABEL}' is NOT loaded.")
            findings.append("The launchd job isn't loaded — it isn't running on a "
                            "schedule. Re-install: python scripts/install_schedule.py")
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("  (launchctl unavailable — not macOS, or run manually)")

    # Verdict ----------------------------------------------------------------
    print("\n" + "=" * 60)
    if findings:
        print("  LIKELY CAUSE(S):")
        for f in findings:
            print(f"   • {f}")
    else:
        print("  No blocking condition found in local files. If it still isn't\n"
              "  trading, the strategy may simply have had no eligible buys — run\n"
              "  `python run.py --status` and check recent 'signals' audit events.")
    print("=" * 60 + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
