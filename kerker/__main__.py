from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys

from .config import AppConfig
from .runner import run_daily, run_once


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="kerker", description="SPY bull put spread bot on IBKR")
    parser.add_argument("command", choices=["once", "daemon"], help="run a single scan, or run forever on schedule")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    _setup_logging(args.log_level)
    cfg = AppConfig.load()

    if args.command == "once":
        result = asyncio.run(run_once(cfg))
        print(json.dumps(result, default=str, indent=2))
        return 0
    if args.command == "daemon":
        asyncio.run(run_daily(cfg))
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
