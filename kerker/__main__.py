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
    parser = argparse.ArgumentParser(prog="kerker", description="IBKR trading bots")
    parser.add_argument("--log-level", default="INFO")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("once", help="bull put spread: run a single scan")
    sub.add_parser("daemon", help="bull put spread: run forever on schedule")
    sub.add_parser(
        "intraday",
        help="intraday TTM Squeeze/MACD/RSI bot (dry-run by default, INTRADAY_DRY_RUN=0 to trade)",
    )

    bt = sub.add_parser("backtest", help="backtest the intraday strategy")
    bt.add_argument("--csv", help="OHLCV csv (datetime,open,high,low,close,volume); if omitted, fetch from IBKR")
    bt.add_argument("--duration", default=None, help='IBKR duration for fetch, e.g. "30 D"')
    bt.add_argument("--trades", action="store_true", help="print each trade")

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
    if args.command == "intraday":
        from .intraday_runner import run_intraday

        asyncio.run(run_intraday(cfg))
        return 0
    if args.command == "backtest":
        from .backtest import Backtester, load_csv

        if args.csv:
            df = load_csv(args.csv, cfg.intraday.market_tz)
        else:
            from .intraday_runner import fetch_history_frame

            df = asyncio.run(fetch_history_frame(cfg, args.duration))
        result = Backtester(cfg.intraday).run(df)
        print(result.summary())
        if args.trades:
            for t in result.trades:
                print(
                    f"{t.entry_time:%Y-%m-%d %H:%M} {t.side:5s} in={t.entry_price:.2f} "
                    f"out={t.exit_price:.2f} ({t.exit_reason}) pnl={t.pnl:+.2f}"
                )
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
