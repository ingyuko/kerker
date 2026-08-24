from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from kerker.backtest import Backtester, load_csv
from kerker.config import IntradayConfig
from kerker.intraday_strategy import LONG

TZ = "America/New_York"


def _cfg(**overrides) -> IntradayConfig:
    base = dict(
        point_value=5.0,
        tick_size=0.25,
        quantity=1,
        rsi_long_max=90.0,  # keep the synthetic breakout inside the RSI window
        max_trades_per_day=6,
        max_daily_loss=10_000.0,
    )
    base.update(overrides)
    return IntradayConfig(**base)


def _day(closes, start="2026-05-04 09:30", spread=0.6) -> pd.DataFrame:
    closes = pd.Series(closes, dtype=float)
    idx = pd.date_range(start, periods=len(closes), freq="5min", tz=TZ)
    return pd.DataFrame(
        {
            "open": closes.shift(1).fillna(closes.iloc[0]).values,
            "high": closes.values + spread,
            "low": closes.values - spread,
            "close": closes.values,
            "volume": 1000.0,
        },
        index=idx,
    )


def _breakout_day(start="2026-05-04 09:30") -> pd.DataFrame:
    """45 bars of tight chop (squeeze), then an up-trending breakout.

    The alternating +0.5/-0.25 steps keep RSI from pegging at 100 while the
    trend, MACD and squeeze momentum all turn long.
    """
    quiet = [5000.0 + (0.02 if i % 2 else -0.02) for i in range(45)]
    price = quiet[-1]
    breakout = []
    for i in range(28):
        price += 1.5 if i % 2 == 0 else -0.5
        breakout.append(price)
    # fade into the close so momentum rolls over and any position exits
    fade = [price - 0.1 * i for i in range(1, 6)]
    return _day(quiet + breakout + fade, start=start)


def test_backtest_takes_a_long_trade_on_breakout_and_closes_same_day():
    df = _breakout_day()
    result = Backtester(_cfg()).run(df)
    assert result.stats["trades"] >= 1
    first = result.trades[0]
    assert first.side == LONG
    assert first.exit_time is not None and first.exit_reason is not None
    # everything opened must be closed by end of the session
    assert all(t.exit_price is not None for t in result.trades)
    # entries only in the allowed window, exits never after the last bar
    last_ts = df.index[-1].to_pydatetime()
    for t in result.trades:
        assert t.entry_time.date() == t.exit_time.date()
        assert t.exit_time <= last_ts


def test_backtest_stats_consistent_with_trades():
    result = Backtester(_cfg()).run(_breakout_day())
    total = sum(t.pnl for t in result.trades)
    assert result.stats["total_pnl"] == pytest.approx(total)
    assert result.stats["sessions"] == 1
    assert result.stats["bars"] == 78


def test_backtest_respects_max_trades_per_day():
    result = Backtester(_cfg(max_trades_per_day=0)).run(_breakout_day())
    assert result.stats["trades"] == 0


def test_backtest_pnl_accounting_for_short():
    bt = Backtester(_cfg(), commission_per_side=1.0, slippage_ticks=0.0)
    # short 2 points profit on point_value 5 => 10 gross, minus 2 commission
    assert bt._pnl("short", 5000.0, 4998.0, 1) == pytest.approx(8.0)
    assert bt._pnl("long", 5000.0, 4998.0, 1) == pytest.approx(-12.0)


def test_two_sessions_are_isolated():
    df = pd.concat([_breakout_day("2026-05-04 09:30"), _breakout_day("2026-05-05 09:30")])
    result = Backtester(_cfg()).run(df)
    assert result.stats["sessions"] == 2
    for t in result.trades:
        assert t.entry_time.date() == t.exit_time.date(), "no position may cross sessions"


def test_load_csv_roundtrip(tmp_path):
    df = _breakout_day()
    path = tmp_path / "bars.csv"
    out = df.copy()
    out.insert(0, "datetime", out.index.tz_localize(None))
    out.to_csv(path, index=False)
    loaded = load_csv(str(path), TZ)
    assert list(loaded.columns) == ["open", "high", "low", "close", "volume"]
    assert loaded.index.tz is not None
    assert len(loaded) == len(df)
    assert loaded["close"].iloc[-1] == pytest.approx(df["close"].iloc[-1])
