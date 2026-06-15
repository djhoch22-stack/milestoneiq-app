#!/usr/bin/env python3
"""Install (or refresh) the macOS launchd schedule for the trading bot.

Auto-detects the current venv Python and the bot paths, writes a LaunchAgent
plist, and loads it so the bot runs automatically each weekday. Run again to
update the schedule (it reloads cleanly).

Usage (from trading-bot/, with the venv ACTIVE so the right Python is used):
    python scripts/install_schedule.py                 # weekdays at 09:00 local
    python scripts/install_schedule.py --hour 9 --minute 30
    python scripts/install_schedule.py --uninstall

Notes:
  * The time is your Mac's LOCAL time. Pick something during US market hours
    (9:30am-4:00pm ET) so orders can fill. The default 09:00 suits Mountain
    time (= 11:00am ET); adjust --hour for your timezone.
  * Your Mac must be awake at the scheduled time; if asleep, launchd runs it at
    the next wake.
  * launchd can't know market holidays — on a holiday the run still fires but
    orders are simply rejected/queued and recorded as no-ops.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

LABEL = "com.user.tradingbot"


def plist_path() -> Path:
    return Path.home() / "Library" / "LaunchAgents" / f"{LABEL}.plist"


def build_plist(python: str, run_py: Path, workdir: Path, hour: int, minute: int) -> str:
    days = "".join(
        f"        <dict><key>Weekday</key><integer>{d}</integer>"
        f"<key>Hour</key><integer>{hour}</integer>"
        f"<key>Minute</key><integer>{minute}</integer></dict>\n"
        for d in range(1, 6)  # Mon..Fri
    )
    out_log = workdir / "data" / "launchd.out.log"
    err_log = workdir / "data" / "launchd.err.log"
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>Label</key><string>{LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python}</string>
        <string>{run_py}</string>
    </array>
    <key>WorkingDirectory</key><string>{workdir}</string>
    <key>StartCalendarInterval</key>
    <array>
{days}    </array>
    <key>StandardOutPath</key><string>{out_log}</string>
    <key>StandardErrorPath</key><string>{err_log}</string>
</dict>
</plist>
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--hour", type=int, default=9)
    ap.add_argument("--minute", type=int, default=0)
    ap.add_argument("--uninstall", action="store_true")
    args = ap.parse_args()

    target = plist_path()
    target.parent.mkdir(parents=True, exist_ok=True)

    # Always unload an existing job first so a re-run refreshes cleanly.
    subprocess.run(["launchctl", "unload", str(target)],
                   capture_output=True, text=True)

    if args.uninstall:
        if target.exists():
            target.unlink()
        print(f"Uninstalled schedule ({LABEL}).")
        return 0

    workdir = Path(__file__).resolve().parent.parent
    run_py = workdir / "run.py"
    (workdir / "data").mkdir(exist_ok=True)
    target.write_text(build_plist(sys.executable, run_py, workdir,
                                  args.hour, args.minute))

    res = subprocess.run(["launchctl", "load", str(target)],
                         capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Wrote {target} but `launchctl load` failed:\n{res.stderr}")
        return 1

    print(f"Scheduled: weekdays at {args.hour:02d}:{args.minute:02d} local time.")
    print(f"  Python : {sys.executable}")
    print(f"  Script : {run_py}")
    print(f"  Plist  : {target}")
    print(f"  Logs   : {workdir / 'data' / 'launchd.out.log'}")
    print("\nManage it:")
    print(f"  Pause trading now : touch {workdir / 'STOP'}")
    print(f"  Resume            : rm {workdir / 'STOP'}")
    print(f"  Remove schedule   : python scripts/install_schedule.py --uninstall")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
