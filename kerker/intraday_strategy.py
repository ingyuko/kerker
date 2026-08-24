"""Intraday TTM Squeeze + MACD + RSI strategy.

Signal logic (long side; short is the mirror image):

Entry — all must be true on a completed bar:
  1. A TTM squeeze fired within the last ``fire_lookback`` bars, after the
     squeeze had been on for at least ``min_squeeze_bars`` bars.
  2. Squeeze momentum is positive and rising.
  3. MACD histogram is positive (MACD line above its signal line).
  4. RSI is inside the long window (strong but not overbought).
  5. Price is above session VWAP (optional filter).

Exit — any of:
  * momentum falls two bars in a row, or
  * MACD histogram flips against the position, or
  * ATR stop-loss / take-profit (handled by bracket orders live, and by
    intrabar high/low checks in the backtester), or
  * forced flatten near the session close.

The same pure functions drive both the backtester and the live runner, so
what you test is what you trade.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time

import pandas as pd

from .config import IntradayConfig
from .indicators import atr, macd, rsi, session_vwap, ttm_squeeze

LONG = "long"
SHORT = "short"


def compute_indicators(df: pd.DataFrame, cfg: IntradayConfig) -> pd.DataFrame:
    """Return a copy of ``df`` with every indicator column the strategy needs.

    ``df`` must have columns open/high/low/close/volume and a DatetimeIndex.
    """
    out = df.copy()
    sq = ttm_squeeze(
        out,
        bb_length=cfg.bb_length,
        bb_mult=cfg.bb_mult,
        kc_length=cfg.kc_length,
        kc_mult=cfg.kc_mult,
        momentum_length=cfg.momentum_length,
    )
    out[["squeeze_on", "squeeze_fired", "momentum"]] = sq
    out[["macd", "macd_signal", "macd_hist"]] = macd(
        out["close"], cfg.macd_fast, cfg.macd_slow, cfg.macd_signal
    )
    out["rsi"] = rsi(out["close"], cfg.rsi_length)
    out["vwap"] = session_vwap(out, cfg.market_tz)
    out["atr"] = atr(out, cfg.atr_length)
    return out


@dataclass
class EntrySignal:
    side: str  # LONG or SHORT
    reasons: list[str]


def _recent_valid_fire(frame: pd.DataFrame, i: int, cfg: IntradayConfig) -> bool:
    """True if a squeeze fired in the last ``fire_lookback`` bars and the
    squeeze that released had lasted at least ``min_squeeze_bars`` bars."""
    start = max(0, i - cfg.fire_lookback + 1)
    for j in range(start, i + 1):
        if not bool(frame["squeeze_fired"].iloc[j]):
            continue
        # count how long the squeeze was on before bar j
        run = 0
        k = j - 1
        while k >= 0 and bool(frame["squeeze_on"].iloc[k]):
            run += 1
            k -= 1
        if run >= cfg.min_squeeze_bars:
            return True
    return False


def entry_signal(frame: pd.DataFrame, i: int, cfg: IntradayConfig) -> EntrySignal | None:
    """Evaluate an entry on completed bar ``i``. Returns None when flat is right."""
    if i < 2:
        return None
    row = frame.iloc[i]
    prev = frame.iloc[i - 1]
    needed = ["momentum", "macd_hist", "rsi", "vwap", "atr"]
    if row[needed].isna().any() or pd.isna(prev["momentum"]):
        return None

    if not _recent_valid_fire(frame, i, cfg):
        return None

    mom_up = row["momentum"] > 0 and row["momentum"] > prev["momentum"]
    mom_down = row["momentum"] < 0 and row["momentum"] < prev["momentum"]

    if mom_up:
        side = LONG
        macd_ok = row["macd_hist"] > 0
        rsi_ok = cfg.rsi_long_min <= row["rsi"] <= cfg.rsi_long_max
        vwap_ok = (not cfg.use_vwap_filter) or row["close"] > row["vwap"]
    elif mom_down:
        side = SHORT
        macd_ok = row["macd_hist"] < 0
        rsi_ok = cfg.rsi_short_min <= row["rsi"] <= cfg.rsi_short_max
        vwap_ok = (not cfg.use_vwap_filter) or row["close"] < row["vwap"]
    else:
        return None

    if not (macd_ok and rsi_ok and vwap_ok):
        return None

    reasons = [
        f"squeeze fired within {cfg.fire_lookback} bars",
        f"momentum {row['momentum']:.3f} ({'rising' if side == LONG else 'falling'})",
        f"macd_hist {row['macd_hist']:.3f}",
        f"rsi {row['rsi']:.1f}",
    ]
    if cfg.use_vwap_filter:
        reasons.append(f"close {row['close']:.2f} vs vwap {row['vwap']:.2f}")
    return EntrySignal(side=side, reasons=reasons)


def exit_signal(frame: pd.DataFrame, i: int, side: str) -> str | None:
    """Indicator-based exit for an open position. Returns a reason or None."""
    if i < 2:
        return None
    m0 = frame["momentum"].iloc[i]
    m1 = frame["momentum"].iloc[i - 1]
    m2 = frame["momentum"].iloc[i - 2]
    hist = frame["macd_hist"].iloc[i]
    if pd.isna(m0) or pd.isna(m1) or pd.isna(m2) or pd.isna(hist):
        return None

    if side == LONG:
        if m0 < m1 < m2:
            return "momentum falling 2 bars"
        if hist < 0:
            return "macd_hist flipped negative"
    else:
        if m0 > m1 > m2:
            return "momentum rising 2 bars"
        if hist > 0:
            return "macd_hist flipped positive"
    return None


def stop_and_target(entry_price: float, side: str, bar_atr: float, cfg: IntradayConfig) -> tuple[float, float]:
    """ATR-based protective stop and profit target, rounded to tick size."""
    stop_off = cfg.stop_atr_mult * bar_atr
    tgt_off = cfg.target_atr_mult * bar_atr
    if side == LONG:
        stop, target = entry_price - stop_off, entry_price + tgt_off
    else:
        stop, target = entry_price + stop_off, entry_price - tgt_off
    return round_to_tick(stop, cfg.tick_size), round_to_tick(target, cfg.tick_size)


def round_to_tick(price: float, tick: float) -> float:
    if tick <= 0:
        return price
    return round(round(price / tick) * tick, 10)


# ----- session / time windows -----


def _parse_hhmm(s: str) -> time:
    hh, mm = s.split(":")
    return time(int(hh), int(mm))


def session_bounds(cfg: IntradayConfig) -> tuple[time, time]:
    return _parse_hhmm(cfg.session_start), _parse_hhmm(cfg.session_end)


def _minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def can_enter_now(ts: datetime, cfg: IntradayConfig) -> bool:
    """Entries allowed only after warmup and before the no-entry window."""
    start, end = session_bounds(cfg)
    m = _minutes(ts.timetz().replace(tzinfo=None) if ts.tzinfo else ts.time())
    return _minutes(start) + cfg.warmup_minutes <= m < _minutes(end) - cfg.no_entry_minutes


def should_flatten(ts: datetime, cfg: IntradayConfig) -> bool:
    _, end = session_bounds(cfg)
    m = _minutes(ts.timetz().replace(tzinfo=None) if ts.tzinfo else ts.time())
    return m >= _minutes(end) - cfg.flatten_minutes


# ----- per-day risk state -----


@dataclass
class DayState:
    """Tracks trades and realized PnL for one session to enforce daily limits."""

    day: date | None = None
    trades: int = 0
    realized_pnl: float = 0.0
    halted_reasons: list[str] = field(default_factory=list)

    def roll(self, day: date) -> None:
        if self.day != day:
            self.day = day
            self.trades = 0
            self.realized_pnl = 0.0
            self.halted_reasons = []

    def record_trade(self, pnl: float) -> None:
        self.trades += 1
        self.realized_pnl += pnl

    def can_trade(self, cfg: IntradayConfig) -> bool:
        self.halted_reasons = []
        if self.trades >= cfg.max_trades_per_day:
            self.halted_reasons.append(
                f"max trades per day reached ({self.trades}/{cfg.max_trades_per_day})"
            )
        if self.realized_pnl <= -abs(cfg.max_daily_loss):
            self.halted_reasons.append(
                f"daily loss limit hit ({self.realized_pnl:.2f} <= -{abs(cfg.max_daily_loss):.2f})"
            )
        return not self.halted_reasons
