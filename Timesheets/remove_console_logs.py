#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path


CONSOLE_PATTERN = re.compile(
    r"^[ \t]*console\.(?:log|debug|info|warn|error|trace|table|dir)\(.*?\);?[ \t]*\n?",
    re.MULTILINE,
)


def main() -> int:
    target_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("index.html")
    if not target_path.exists():
        print(f"File not found: {target_path}")
        return 1

    original = target_path.read_text(encoding="utf-8")
    matches = list(CONSOLE_PATTERN.finditer(original))
    updated = CONSOLE_PATTERN.sub("", original)

    if updated != original:
        target_path.write_text(updated, encoding="utf-8")

    print(f"Removed {len(matches)} console log statement(s) from {target_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

