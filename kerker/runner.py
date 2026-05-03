from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

import pytz

from .config import AppConfig
from .ibkr_client import IBKRClient
from .scheduler import next_run_time
from .strategy import BullPutSpreadStrategy

log = logging.getLogger(__name__)


async def run_once(cfg: AppConfig) -> dict:
    client = IBKRClient(cfg.ibkr)
    try:
        await client.connect()
        strat = BullPutSpreadStrategy(client, cfg.strategy)
        return await strat.scan_and_trade()
    finally:
        await client.disconnect()


async def run_daily(cfg: AppConfig) -> None:
    """Loop forever; sleep until next session's run time, then scan."""
    tz = pytz.timezone(cfg.schedule.market_tz)
    while True:
        now = datetime.now(tz)
        target = next_run_time(now, cfg.schedule.minutes_after_open, cfg.schedule.market_tz)
        sleep_s = max(0.0, (target - now).total_seconds())
        log.info("sleeping %.0fs until next scan at %s", sleep_s, target.isoformat())
        await asyncio.sleep(sleep_s)
        try:
            result = await run_once(cfg)
            log.info("scan result: %s", json.dumps(result, default=str))
        except Exception as exc:  # noqa: BLE001
            log.exception("scan failed: %s", exc)
        # tiny buffer so we don't immediately re-pick the same slot
        await asyncio.sleep(60)
