from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
import pytz

from kerker.config import StrategyConfig
from kerker.ibkr_client import IBKRClient
from kerker.scheduler import next_run_time
from kerker.strategy import (
    evaluate_market_filters,
    pick_long_strike,
    pick_short_strike,
)


def _make_cfg(**overrides) -> StrategyConfig:
    base = dict(
        symbol="SPY",
        dte_min=30,
        dte_max=45,
        short_put_delta=0.20,
        spread_width=5.0,
        min_credit_ratio=0.25,
        quantity=1,
        vix_min=12.0,
        vix_max=28.0,
        require_above_prev_close=True,
        transmit=False,
    )
    base.update(overrides)
    return StrategyConfig(**base)


def test_market_filter_passes_in_normal_regime():
    cfg = _make_cfg()
    res = evaluate_market_filters(spy_price=510.0, spy_prev_close=500.0, vix=18.0, cfg=cfg)
    assert res.passed
    assert res.reasons == []


def test_market_filter_rejects_below_prev_close():
    cfg = _make_cfg()
    res = evaluate_market_filters(spy_price=499.0, spy_prev_close=500.0, vix=18.0, cfg=cfg)
    assert not res.passed
    assert any("prev close" in r for r in res.reasons)


def test_market_filter_rejects_high_vix():
    cfg = _make_cfg()
    res = evaluate_market_filters(spy_price=510.0, spy_prev_close=500.0, vix=35.0, cfg=cfg)
    assert not res.passed
    assert any("VIX" in r for r in res.reasons)


def test_market_filter_rejects_low_vix():
    cfg = _make_cfg()
    res = evaluate_market_filters(spy_price=510.0, spy_prev_close=500.0, vix=10.0, cfg=cfg)
    assert not res.passed


def test_pick_short_strike_closest_to_target_delta():
    deltas = {500.0: -0.35, 495.0: -0.25, 490.0: -0.18, 485.0: -0.10}
    chosen = pick_short_strike(deltas, target_delta=0.20)
    assert chosen == 490.0


def test_pick_short_strike_returns_none_for_empty():
    assert pick_short_strike({}, 0.2) is None


def test_pick_long_strike_picks_closest_below():
    available = [480.0, 485.0, 487.0, 490.0, 495.0]
    # short=490, width=5 => target 485
    assert pick_long_strike(490.0, available, 5.0) == 485.0


def test_pick_long_strike_falls_back_to_nearest_below_when_exact_missing():
    available = [480.0, 487.0, 490.0]
    # target 485, only 480 and 487 are < 490; 487 is closer to 485
    assert pick_long_strike(490.0, available, 5.0) == 487.0


def test_pick_long_strike_returns_none_when_no_lower_strike():
    assert pick_long_strike(490.0, [490.0, 495.0], 5.0) is None


def test_pick_expiry_chooses_midpoint():
    today = date(2026, 5, 4)  # Monday
    expirations = [
        (today + timedelta(days=10)).strftime("%Y%m%d"),  # too close
        (today + timedelta(days=32)).strftime("%Y%m%d"),
        (today + timedelta(days=38)).strftime("%Y%m%d"),  # closest to 37.5 mid
        (today + timedelta(days=60)).strftime("%Y%m%d"),  # too far
    ]
    chosen = IBKRClient.pick_expiry(expirations, dte_min=30, dte_max=45, today=today)
    assert chosen == (today + timedelta(days=38)).strftime("%Y%m%d")


def test_pick_expiry_returns_none_when_window_empty():
    today = date(2026, 5, 4)
    expirations = [(today + timedelta(days=5)).strftime("%Y%m%d")]
    assert IBKRClient.pick_expiry(expirations, 30, 45, today=today) is None


def test_next_run_time_skips_past_run_today():
    tz = pytz.timezone("America/New_York")
    # 2026-05-04 is a Monday; market opens 09:30 ET, scan at 10:00.
    # If "now" is 11:00 ET Monday, next run should be Tuesday 10:00.
    now = tz.localize(datetime(2026, 5, 4, 11, 0))
    nxt = next_run_time(now, minutes_after_open=30)
    assert nxt.hour == 10 and nxt.minute == 0
    assert nxt.date() == datetime(2026, 5, 5).date()


def test_next_run_time_returns_today_when_before_window():
    tz = pytz.timezone("America/New_York")
    now = tz.localize(datetime(2026, 5, 4, 8, 0))
    nxt = next_run_time(now, minutes_after_open=30)
    assert nxt.date() == datetime(2026, 5, 4).date()
    assert nxt.hour == 10 and nxt.minute == 0


def test_next_run_time_skips_weekend():
    tz = pytz.timezone("America/New_York")
    # 2026-05-02 is Saturday; next session is Monday 2026-05-04.
    now = tz.localize(datetime(2026, 5, 2, 12, 0))
    nxt = next_run_time(now, minutes_after_open=30)
    assert nxt.date() == datetime(2026, 5, 4).date()
