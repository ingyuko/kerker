from __future__ import annotations

import logging
from datetime import datetime, time, timedelta

import pandas_market_calendars as mcal
import pytz

log = logging.getLogger(__name__)


def next_run_time(
    now: datetime,
    minutes_after_open: int,
    tz_name: str = "America/New_York",
    calendar_name: str = "NYSE",
) -> datetime:
    """Return the next scheduled run time (timezone-aware in market tz).

    Uses the NYSE calendar so weekends and exchange holidays are skipped.
    If today's run time is still in the future, returns today; otherwise the next
    open session's run time.
    """
    tz = pytz.timezone(tz_name)
    now_local = now.astimezone(tz)
    cal = mcal.get_calendar(calendar_name)

    # Look ahead 14 days to be safe across long weekends.
    schedule = cal.schedule(
        start_date=now_local.date(),
        end_date=(now_local + timedelta(days=14)).date(),
    )
    if schedule.empty:
        raise RuntimeError("no upcoming trading sessions found")

    for _, row in schedule.iterrows():
        market_open = row["market_open"].tz_convert(tz).to_pydatetime()
        run_at = market_open + timedelta(minutes=minutes_after_open)
        if run_at > now_local:
            return run_at
    raise RuntimeError("no future session in window")


def is_today_trading_day(now: datetime, tz_name: str = "America/New_York", calendar_name: str = "NYSE") -> bool:
    tz = pytz.timezone(tz_name)
    today = now.astimezone(tz).date()
    cal = mcal.get_calendar(calendar_name)
    schedule = cal.schedule(start_date=today, end_date=today)
    return not schedule.empty
