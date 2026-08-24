"""Pure pandas/numpy technical indicators for the intraday bot.

All functions are causal (no look-ahead): the value at row *i* only uses
data up to and including row *i*, so the same code is safe for both
backtesting and live trading.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def sma(series: pd.Series, length: int) -> pd.Series:
    return series.rolling(length, min_periods=length).mean()


def ema(series: pd.Series, length: int) -> pd.Series:
    return series.ewm(span=length, adjust=False, min_periods=length).mean()


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    ranges = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    )
    return ranges.max(axis=1)


def atr(df: pd.DataFrame, length: int = 14) -> pd.Series:
    """Wilder's Average True Range."""
    tr = true_range(df)
    return tr.ewm(alpha=1.0 / length, adjust=False, min_periods=length).mean()


def macd(
    close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> pd.DataFrame:
    """MACD line, signal line and histogram (matches the classic 12/26/9)."""
    macd_line = ema(close, fast) - ema(close, slow)
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    return pd.DataFrame(
        {
            "macd": macd_line,
            "macd_signal": signal_line,
            "macd_hist": macd_line - signal_line,
        }
    )


def rsi(close: pd.Series, length: int = 14) -> pd.Series:
    """Wilder's RSI."""
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    avg_gain = gain.ewm(alpha=1.0 / length, adjust=False, min_periods=length).mean()
    avg_loss = loss.ewm(alpha=1.0 / length, adjust=False, min_periods=length).mean()
    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    out = 100.0 - 100.0 / (1.0 + rs)
    # all-gain windows => RSI 100; completely flat windows => neutral 50
    out = out.where(~((avg_loss == 0.0) & (avg_gain > 0.0)), 100.0)
    out = out.where(~((avg_loss == 0.0) & (avg_gain == 0.0)), 50.0)
    return out.where(avg_gain.notna() & avg_loss.notna())


def session_vwap(df: pd.DataFrame, tz: str = "America/New_York") -> pd.Series:
    """Volume-weighted average price, anchored to each trading day.

    Resets at the start of every session (calendar day in market tz),
    matching the VWAP study on intraday charts.
    """
    idx = df.index
    if idx.tz is None:
        local = idx
    else:
        local = idx.tz_convert(tz)
    session = pd.Series(local.date, index=idx)
    typical = (df["high"] + df["low"] + df["close"]) / 3.0
    vol = df["volume"].clip(lower=0.0)
    pv = (typical * vol).groupby(session).cumsum()
    cum_vol = vol.groupby(session).cumsum()
    vwap = pv / cum_vol.replace(0.0, np.nan)
    # bars with zero cumulative volume fall back to the typical price
    return vwap.fillna(typical)


def bollinger(close: pd.Series, length: int = 20, mult: float = 2.0) -> pd.DataFrame:
    mid = sma(close, length)
    std = close.rolling(length, min_periods=length).std(ddof=0)
    return pd.DataFrame(
        {"bb_mid": mid, "bb_upper": mid + mult * std, "bb_lower": mid - mult * std}
    )


def keltner(df: pd.DataFrame, length: int = 20, mult: float = 1.5) -> pd.DataFrame:
    mid = ema(df["close"], length)
    rng = atr(df, length)
    return pd.DataFrame(
        {"kc_mid": mid, "kc_upper": mid + mult * rng, "kc_lower": mid - mult * rng}
    )


def linreg_endpoint(series: pd.Series, length: int) -> pd.Series:
    """Rolling linear-regression value evaluated at the window's last bar.

    Closed form: with x = 0..n-1, endpoint = mean(y) + slope * (n-1)/2.
    This is what thinkorswim's Inertia()/TTM momentum uses.
    """
    n = length
    x = np.arange(n, dtype=float)
    x_mean = x.mean()
    x_var = ((x - x_mean) ** 2).sum()

    def _endpoint(y: np.ndarray) -> float:
        y_mean = y.mean()
        slope = ((x - x_mean) * (y - y_mean)).sum() / x_var
        return y_mean + slope * (n - 1 - x_mean)

    return series.rolling(n, min_periods=n).apply(_endpoint, raw=True)


def ttm_squeeze(
    df: pd.DataFrame,
    bb_length: int = 20,
    bb_mult: float = 2.0,
    kc_length: int = 20,
    kc_mult: float = 1.5,
    momentum_length: int = 20,
) -> pd.DataFrame:
    """John Carter's TTM Squeeze.

    - ``squeeze_on``: Bollinger Bands fully inside the Keltner Channel
      (low volatility; the market is "coiling").
    - ``squeeze_fired``: first bar where the squeeze releases.
    - ``momentum``: linear-regression momentum histogram; its sign at the
      fire bar gives the trade direction.
    """
    bb = bollinger(df["close"], bb_length, bb_mult)
    kc = keltner(df, kc_length, kc_mult)

    squeeze_on = (bb["bb_upper"] < kc["kc_upper"]) & (bb["bb_lower"] > kc["kc_lower"])
    squeeze_on = squeeze_on.fillna(False)
    squeeze_fired = (~squeeze_on) & squeeze_on.shift(1, fill_value=False)

    n = momentum_length
    donchian_mid = (
        df["high"].rolling(n, min_periods=n).max()
        + df["low"].rolling(n, min_periods=n).min()
    ) / 2.0
    baseline = (donchian_mid + sma(df["close"], n)) / 2.0
    momentum = linreg_endpoint(df["close"] - baseline, n)

    return pd.DataFrame(
        {
            "squeeze_on": squeeze_on,
            "squeeze_fired": squeeze_fired,
            "momentum": momentum,
        }
    )
