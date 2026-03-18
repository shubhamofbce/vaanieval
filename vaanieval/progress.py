from __future__ import annotations

import sys

_inline_progress_active = False


def log_event(message: str) -> None:
    global _inline_progress_active
    if _inline_progress_active:
        print("", flush=True)
        _inline_progress_active = False
    print(f"[vaanieval] {message}", flush=True)


def update_progress(current: int, total: int, prefix: str = "Progress") -> None:
    global _inline_progress_active

    if total <= 0:
        return

    clamped = max(0, min(current, total))
    ratio = clamped / total
    width = 30
    filled = int(width * ratio)
    bar = "#" * filled + "-" * (width - filled)
    percent = int(ratio * 100)
    line = f"{prefix}: [{bar}] {clamped}/{total} ({percent}%)"

    if sys.stdout.isatty():
        _inline_progress_active = clamped < total
        print(f"\r{line}", end="" if clamped < total else "\n", flush=True)
    else:
        print(line, flush=True)


def finalize_progress() -> None:
    global _inline_progress_active
    if _inline_progress_active:
        print("", flush=True)
        _inline_progress_active = False
