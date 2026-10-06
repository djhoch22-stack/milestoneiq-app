#!/usr/bin/env python3
"""Switch strategy.mode in config.yaml between 'momentum' and 'congress'.

Edits only the one line inside the strategy: block, preserving the rest of your
config and its comments. If no strategy.mode line exists yet (older config), it
inserts one. When switching to 'congress' with no congress: block present, the
built-in defaults apply (member Pelosi, last 365 days, top 5, mirror call buys);
add a congress: block to config.yaml to customize.

Usage (from trading-bot/):
    .venv/bin/python scripts/set_strategy.py congress
    .venv/bin/python scripts/set_strategy.py momentum
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

VALID = ("momentum", "congress")


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in VALID:
        print(f"Usage: set_strategy.py [{'|'.join(VALID)}]")
        return 2
    new_mode = sys.argv[1]

    cfg_path = Path(__file__).resolve().parent.parent / "config.yaml"
    if not cfg_path.exists():
        print("config.yaml not found."); return 2
    lines = cfg_path.read_text().splitlines(keepends=True)

    # Find the top-level `strategy:` key.
    strat_i = next((i for i, ln in enumerate(lines)
                    if re.match(r"^strategy:\s*(#.*)?$", ln)), None)
    if strat_i is None:
        print("No top-level 'strategy:' block found in config.yaml."); return 1

    # Walk its block (indented / blank lines) looking for a `mode:` line.
    mode_re = re.compile(r"^(\s+)mode:\s*\S+(.*)$")
    end = len(lines)
    found = None
    for i in range(strat_i + 1, len(lines)):
        ln = lines[i]
        if ln.strip() and not ln.startswith((" ", "\t")):
            end = i
            break
        m = mode_re.match(ln)
        if m:
            found = (i, m)

    if found:
        i, m = found
        indent, trailing = m.group(1), m.group(2)
        comment = " " + trailing.strip() if trailing.strip().startswith("#") else ""
        lines[i] = f"{indent}mode: {new_mode}{comment}\n"
    else:
        lines.insert(strat_i + 1, f"  mode: {new_mode}\n")

    cfg_path.write_text("".join(lines))
    print(f"✓ strategy.mode set to '{new_mode}' in config.yaml")
    if new_mode == "congress":
        print("  (Preview what it would buy: "
              ".venv/bin/python scripts/preview_congress.py)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
