from __future__ import annotations

from datetime import date, datetime

import pandas as pd
import pytest
import pytz

from kerker.config import IntradayConfig
from kerker.intraday_strategy import (
    LONG,
    SHORT,
    DayState,
    can_enter_now,
    entry_signal,
    exit_signal,
    round_to_tick,
    should_flatten,
    stop_and_target,
)

TZ = pytz.timezone("America/New_York")


def _cfg(**overrides) -> IntradayConfig:
    base = dict(min_squeeze_bars=4, fire_lookback=3, use_vwap_filter=True)
    base.update(overrides)
    return IntradayConfig(**base)


def _frame(**cols) -> pd.DataFrame:
    n = len(next(iter(cols.values())))
    idx = pd.date_range("2026-05-04 09:30", periods=n, freq="5min", tz="America/New_York")
    return pd.DataFrame(cols, index=idx)


def _long_setup_frame(**overrides) -> pd.DataFrame:
    """8 bars: squeeze on 0..4, fires at 5, rising positive momentum."""
    cols = dict(
        close=[100.0] * 5 + [101.0, 102.0, 103.0],
        squeeze_on=[True] * 5 + [False] * 3,
        squeeze_fired=[False] * 5 + [True, False, False],
        momentum=[0.0] * 5 + [0.3, 0.5, 0.8],
        macd_hist=[0.0] * 5 + [0.1, 0.2, 0.3],
        rsi=[50.0] * 5 + [60.0, 62.0, 64.0],
        vwap=[100.0] * 8,
        atr=[1.0] * 8,
    )
    cols.update(overrides)
    return _frame(**cols)


def test_entry_signal_long_when_all_conditions_align():
    sig = entry_signal(_long_setup_frame(), 7, _cfg())
    assert sig is not None
    assert sig.side == LONG
    assert any("squeeze" in r for r in sig.reasons)


def test_entry_signal_short_mirror():
    frame = _long_setup_frame(
        close=[100.0] * 5 + [99.0, 98.0, 97.0],
        momentum=[0.0] * 5 + [-0.3, -0.5, -0.8],
        macd_hist=[0.0] * 5 + [-0.1, -0.2, -0.3],
        rsi=[50.0] * 5 + [40.0, 38.0, 36.0],
        vwap=[100.0] * 8,
    )
    sig = entry_signal(frame, 7, _cfg())
    assert sig is not None
    assert sig.side == SHORT


def test_entry_rejected_without_recent_fire():
    frame = _long_setup_frame(squeeze_fired=[False] * 8)
    assert entry_signal(frame, 7, _cfg()) is None


def test_entry_rejected_when_fire_is_stale():
    # fire at bar 5, but lookback of 1 means bar 7 no longer qualifies
    assert entry_signal(_long_setup_frame(), 7, _cfg(fire_lookback=1)) is None


def test_entry_rejected_when_squeeze_too_short():
    frame = _long_setup_frame(squeeze_on=[False, False, False, True, True, False, False, False])
    # squeeze only lasted 2 bars before firing
    assert entry_signal(frame, 7, _cfg(min_squeeze_bars=4)) is None


def test_entry_rejected_when_macd_disagrees():
    frame = _long_setup_frame(macd_hist=[0.0] * 5 + [-0.1, -0.2, -0.3])
    assert entry_signal(frame, 7, _cfg()) is None


def test_entry_rejected_when_rsi_overbought():
    frame = _long_setup_frame(rsi=[50.0] * 5 + [80.0, 82.0, 85.0])
    assert entry_signal(frame, 7, _cfg()) is None


def test_entry_rejected_below_vwap_unless_filter_off():
    frame = _long_setup_frame(vwap=[110.0] * 8)
    assert entry_signal(frame, 7, _cfg()) is None
    assert entry_signal(frame, 7, _cfg(use_vwap_filter=False)) is not None


def test_entry_rejected_when_momentum_not_rising():
    frame = _long_setup_frame(momentum=[0.0] * 5 + [0.8, 0.5, 0.3])
    assert entry_signal(frame, 7, _cfg()) is None


def test_exit_on_momentum_fade():
    frame = _frame(momentum=[1.0, 0.8, 0.6], macd_hist=[0.5, 0.5, 0.5])
    assert exit_signal(frame, 2, LONG) == "momentum falling 2 bars"
    # falling momentum with a negative histogram is exactly what a short wants
    short_frame = _frame(momentum=[1.0, 0.8, 0.6], macd_hist=[-0.5, -0.5, -0.5])
    assert exit_signal(short_frame, 2, SHORT) is None


def test_exit_on_macd_flip():
    frame = _frame(momentum=[1.0, 0.8, 0.9], macd_hist=[0.5, 0.1, -0.2])
    assert exit_signal(frame, 2, LONG) == "macd_hist flipped negative"


def test_no_exit_while_trend_intact():
    frame = _frame(momentum=[0.5, 0.8, 1.0], macd_hist=[0.2, 0.3, 0.4])
    assert exit_signal(frame, 2, LONG) is None


def test_stop_and_target_rounded_to_tick():
    cfg = _cfg(stop_atr_mult=1.5, target_atr_mult=2.5, tick_size=0.25)
    stop, target = stop_and_target(5000.10, LONG, 2.0, cfg)
    assert stop == pytest.approx(4997.0)   # 5000.10 - 3.0 = 4997.10 -> 4997.00
    assert target == pytest.approx(5005.0)  # 5000.10 + 5.0 = 5005.10 -> 5005.00
    stop_s, target_s = stop_and_target(5000.10, SHORT, 2.0, cfg)
    assert stop_s > 5000.10 > target_s


def test_round_to_tick():
    assert round_to_tick(4999.87, 0.25) == pytest.approx(4999.75)
    assert round_to_tick(4999.88, 0.25) == pytest.approx(5000.0)


def test_can_enter_now_respects_warmup_and_cutoff():
    cfg = _cfg(session_start="09:30", session_end="16:00", warmup_minutes=15, no_entry_minutes=30)
    assert not can_enter_now(TZ.localize(datetime(2026, 5, 4, 9, 40)), cfg)
    assert can_enter_now(TZ.localize(datetime(2026, 5, 4, 10, 0)), cfg)
    assert can_enter_now(TZ.localize(datetime(2026, 5, 4, 15, 25)), cfg)
    assert not can_enter_now(TZ.localize(datetime(2026, 5, 4, 15, 35)), cfg)


def test_should_flatten_near_close():
    cfg = _cfg(session_end="16:00", flatten_minutes=10)
    assert not should_flatten(TZ.localize(datetime(2026, 5, 4, 15, 45)), cfg)
    assert should_flatten(TZ.localize(datetime(2026, 5, 4, 15, 50)), cfg)


def test_day_state_limits_and_rollover():
    cfg = _cfg(max_trades_per_day=2, max_daily_loss=300.0)
    ds = DayState()
    ds.roll(date(2026, 5, 4))
    assert ds.can_trade(cfg)
    ds.record_trade(-150.0)
    ds.record_trade(-200.0)  # 2 trades AND -350 loss
    assert not ds.can_trade(cfg)
    assert len(ds.halted_reasons) == 2
    # next session resets everything
    ds.roll(date(2026, 5, 5))
    assert ds.trades == 0 and ds.realized_pnl == 0.0
    assert ds.can_trade(cfg)
