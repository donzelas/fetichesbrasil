"""Logger simples para stderr com timestamp ISO."""
import sys
from datetime import datetime


def log(msg: str) -> None:
    timestamp = datetime.now().isoformat(timespec="seconds")
    print(f"[{timestamp}] {msg}", flush=True, file=sys.stderr)
