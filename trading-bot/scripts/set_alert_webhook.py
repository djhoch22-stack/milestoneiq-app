#!/usr/bin/env python3
"""Set the alert webhook URL in config.yaml and send a test alert.

Easiest phone setup (free, no account):
  1. Install the "ntfy" app (iOS/Android) or open https://ntfy.sh in a browser.
  2. Subscribe to a private, hard-to-guess topic, e.g. "dylan-bot-7h2k9x".
  3. Run:  .venv/bin/python scripts/set_alert_webhook.py https://ntfy.sh/dylan-bot-7h2k9x
     You should get a test notification on your phone within a few seconds.

Any endpoint that accepts a plain-text POST works (ntfy, a Slack/Discord webhook
relay, etc.). Pass "" to clear it.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))


def set_webhook(url: str) -> None:
    cfg_path = BASE / "config.yaml"
    lines = cfg_path.read_text().splitlines(keepends=True)

    alerts_i = next((i for i, ln in enumerate(lines)
                     if re.match(r"^alerts:\s*(#.*)?$", ln)), None)
    new_line = f'  webhook_url: "{url}"\n'

    if alerts_i is None:
        if lines and not lines[-1].endswith("\n"):
            lines.append("\n")
        lines.append("\nalerts:\n")
        lines.append(new_line)
    else:
        # Find webhook_url within the alerts block; replace or insert.
        end = len(lines)
        wh_i = None
        for i in range(alerts_i + 1, len(lines)):
            if lines[i].strip() and not lines[i].startswith((" ", "\t")):
                end = i
                break
            if re.match(r"^\s+webhook_url:", lines[i]):
                wh_i = i
        if wh_i is not None:
            lines[wh_i] = new_line
        else:
            lines.insert(alerts_i + 1, new_line)

    cfg_path.write_text("".join(lines))


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: set_alert_webhook.py <webhook_url>   (or \"\" to clear)")
        return 2
    url = sys.argv[1].strip()
    set_webhook(url)
    print(f"✓ alerts.webhook_url set to: {url or '(cleared)'}")

    if not url:
        return 0

    from bot.config import load_config
    from bot import notify
    cfg = load_config(BASE / "config.yaml")
    print("Sending a test alert...")
    notify.alert(cfg, "Test alert ✅",
                 "Your trading bot can now reach you here. If you got this on "
                 "your phone, alerts are working.")
    print("Sent. Check your phone/ntfy app. If nothing arrives, double-check the "
          "topic URL and that you're subscribed to it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
