"""Alerting + heartbeat — so the bot can never again fail silently for months.

Every run records a heartbeat (data/last_status.json) with when it last ran and
whether it was healthy. Anything that stops the bot trading — a reconciliation
abort, an expired Robinhood login, or the drawdown kill switch firing — raises a
loud alert through every configured channel:

  * always: data/ALERT.txt (latest) + data/alerts.log (history) + stderr
  * macOS: a Notification Center banner (best effort)
  * optional: an email (if alerts.email_to + SMTP are set in config.yaml)
  * optional: an HTTP POST (if alerts.webhook_url is set — e.g. an ntfy.sh topic)

Everything here is best-effort and never raises: a broken alert channel must not
take down the bot on top of whatever it was trying to warn you about.
"""
from __future__ import annotations

import json
import smtplib
import subprocess
import sys
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path


def _data_dir(cfg) -> Path:
    return cfg.state_file.parent


def heartbeat(cfg, status: str, message: str = "", **extra) -> None:
    """Record the latest run outcome. status: 'ok' | 'halted' | 'alert'."""
    try:
        d = _data_dir(cfg)
        d.mkdir(parents=True, exist_ok=True)
        payload = {"ts": datetime.now().isoformat(), "status": status,
                   "message": message, **extra}
        (d / "last_status.json").write_text(json.dumps(payload, indent=2))
    except Exception:  # noqa: BLE001 - heartbeat must never break a run
        pass


def _macos_banner(subject: str, body: str) -> None:
    try:
        text = body.replace('"', "'")[:200]
        title = subject.replace('"', "'")[:80]
        subprocess.run(
            ["osascript", "-e",
             f'display notification "{text}" with title "Trading bot: {title}"'],
            capture_output=True, timeout=5)
    except Exception:  # noqa: BLE001
        pass


def _send_email(cfg, subject: str, body: str) -> None:
    a = cfg.alerts
    if not (a.email_to and a.smtp_host and a.smtp_user and a.smtp_password):
        return
    try:
        msg = EmailMessage()
        msg["Subject"] = f"[trading-bot] {subject}"
        msg["From"] = a.email_from or a.smtp_user
        msg["To"] = a.email_to
        msg.set_content(body)
        with smtplib.SMTP(a.smtp_host, a.smtp_port, timeout=15) as s:
            s.starttls()
            s.login(a.smtp_user, a.smtp_password)
            s.send_message(msg)
    except Exception as e:  # noqa: BLE001
        print(f"  (email alert failed: {e})", file=sys.stderr)


def _post_webhook(cfg, subject: str, body: str) -> None:
    url = cfg.alerts.webhook_url
    if not url:
        return
    try:
        import requests
        # Plain-text POST with a Title header works with ntfy.sh and most simple
        # webhook receivers. HTTP headers must be Latin-1, so strip any non-ASCII
        # (e.g. emoji) from the Title; the full UTF-8 text stays in the body.
        title = f"trading-bot: {subject}".encode("ascii", "ignore").decode("ascii")
        requests.post(url, data=f"{subject}\n\n{body}".encode("utf-8"),
                      headers={"Title": title}, timeout=15)
    except Exception as e:  # noqa: BLE001
        print(f"  (webhook alert failed: {e})", file=sys.stderr)


def alert(cfg, subject: str, body: str) -> None:
    """Fire a loud, multi-channel alert. Best effort; never raises."""
    stamp = datetime.now().isoformat()
    line = f"{stamp}  {subject}\n{body}\n"
    print(f"\n  🚨 ALERT: {subject}\n  {body}\n", file=sys.stderr)
    try:
        d = _data_dir(cfg)
        d.mkdir(parents=True, exist_ok=True)
        (d / "ALERT.txt").write_text(line)
        with open(d / "alerts.log", "a") as f:
            f.write(line + "-" * 60 + "\n")
    except Exception:  # noqa: BLE001
        pass
    heartbeat(cfg, "alert", subject)
    _macos_banner(subject, body)
    _send_email(cfg, subject, body)
    _post_webhook(cfg, subject, body)
