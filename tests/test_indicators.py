from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from kerker.indicators import (
    atr,
    bollinger,
    ema,
    keltner,
    linreg_endpoint,
    macd,
    rsi,
    session_vwap,
    sma,
    ttm_squeeze,
)

TZ = "America/New_York"


def _ohlcv(closes, spread=0.5, volume=100.0, start="2026-05-04 09:30", freq="5min"):
    closes = pd.Series(closes, dtype=float)
    idx = pd.date_range(start, periods=len(closes), freq=freq, tz=TZ)
    return pd.DataFrame(
        {
            "open": closes.shift(1).fillna(closes.iloc[0]).values,
            "high": closes.values + spread,
            "low": closes.values - spread,
            "close": closes.values,
            "volume": volume,
        },
        index=idx,
    )


def test_sma_and_ema_track_constant_series():
    s = pd.Series([5.0] * 30)
    assert sma(s, 10).iloc[-1] == pytest.approx(5.0)
    assert ema(s, 10).iloc[-1] == pytest.approx(5.0)


def test_rsi_bounds_and_extremes():
    up = pd.Series(np.arange(1.0, 40.0))  # only gains
    assert rsi(up, 14).iloc[-1] == pytest.approx(100.0)
    down = pd.Series(np.arange(40.0, 1.0, -1.0))  # only losses
    assert rsi(down, 14).iloc[-1] == pytest.approx(0.0)
    flat = pd.Series([10.0] * 40)
    assert rsi(flat, 14).iloc[-1] == pytest.approx(50.0)
    mixed = pd.Series(100 + np.sin(np.linspace(0, 12, 200)))
    vals = rsi(mixed, 14).dropna()
    assert ((vals >= 0) & (vals <= 100)).all()


def test_macd_positive_in_uptrend_negative_in_downtrend():
    up = pd.Series(np.linspace(100, 140, 120))
    m = macd(up)
    assert m["macd"].iloc[-1] > 0
    down = pd.Series(np.linspace(140, 100, 120))
    m2 = macd(down)
    assert m2["macd"].iloc[-1] < 0


def test_atr_positive_and_scales_with_range():
    small = atr(_ohlcv([100.0] * 50, spread=0.25), 14).iloc[-1]
    big = atr(_ohlcv([100.0] * 50, spread=2.0), 14).iloc[-1]
    assert small > 0
    assert big > small


def test_session_vwap_resets_each_day():
    day1 = _ohlcv([100, 101, 102], start="2026-05-04 09:30")
    day2 = _ohlcv([200, 201, 202], start="2026-05-05 09:30")
    df = pd.concat([day1, day2])
    v = session_vwap(df, TZ)
    # first bar of day 2 must ignore day 1 entirely => equals its typical price
    typical = (df["high"].iloc[3] + df["low"].iloc[3] + df["close"].iloc[3]) / 3
    assert v.iloc[3] == pytest.approx(typical)
    assert v.iloc[2] < 150  # day-1 vwap never contaminated by day-2 prices


def test_bollinger_and_keltner_shape():
    df = _ohlcv(100 + np.sin(np.linspace(0, 10, 60)))
    bb = bollinger(df["close"], 20, 2.0)
    kc = keltner(df, 20, 1.5)
    tail_bb = bb.dropna()
    tail_kc = kc.dropna()
    assert (tail_bb["bb_upper"] >= tail_bb["bb_lower"]).all()
    assert (tail_kc["kc_upper"] >= tail_kc["kc_lower"]).all()


def test_linreg_endpoint_recovers_linear_series():
    s = pd.Series(2.0 * np.arange(30) + 3.0)
    out = linreg_endpoint(s, 5)
    # a perfect line's regression endpoint equals the actual last value
    assert out.iloc[-1] == pytest.approx(s.iloc[-1])


def _squeeze_then_breakout() -> pd.DataFrame:
    # quiet chop: closes nearly constant (tiny std) but decent high/low range,
    # so Bollinger collapses inside Keltner -> squeeze on
    quiet = [100.0 + (0.02 if i % 2 else -0.02) for i in range(40)]
    # breakout: strong directional move expands the bands -> squeeze fires
    breakout = list(100.0 + 0.8 * np.arange(1, 21))
    return _ohlcv(quiet + breakout, spread=0.6)


def test_ttm_squeeze_detects_squeeze_and_fire():
    df = _squeeze_then_breakout()
    sq = ttm_squeeze(df)
    assert sq["squeeze_on"].iloc[30:40].any(), "quiet period should squeeze"
    assert sq["squeeze_fired"].iloc[40:50].any(), "breakout should release the squeeze"
    fired_at = sq.index[sq["squeeze_fired"]][0]
    after = sq.loc[fired_at:, "momentum"].dropna()
    assert (after.tail(10) > 0).all(), "upside breakout momentum should be positive"


def test_indicators_are_causal_no_lookahead():
    """Truncating the future must not change past indicator values."""
    df = _squeeze_then_breakout()
    full = ttm_squeeze(df)
    part = ttm_squeeze(df.iloc[:50])
    pd.testing.assert_series_equal(full["momentum"].iloc[:50], part["momentum"])
    r_full = rsi(df["close"], 14).iloc[:50]
    r_part = rsi(df["close"].iloc[:50], 14)
    pd.testing.assert_series_equal(r_full, r_part)
