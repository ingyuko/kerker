"""Bar-by-bar backtester for the intraday TTM Squeeze strategy.

Execution model (conservative, no look-ahead):
  * signals are evaluated on a completed bar's close,
  * entries fill at the *next* bar's open (plus slippage),
  * the ATR stop/target from the entry bar are checked against every later
    bar's high/low; if both could fill in one bar, the stop is assumed,
  * indicator exits fill at the next bar's open,
  * any open position is flattened at the close of the session's last
    tradeable bar (``flatten_minutes`` before the configured session end),
  * daily limits (max trades / max loss) halt trading for the day.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd

from .config import IntradayConfig
from .intraday_strategy import (
    LONG,
    DayState,
    can_enter_now,
    compute_indicators,
    entry_signal,
    exit_signal,
    should_flatten,
    stop_and_target,
)


@dataclass
class TradeRecord:
    side: str
    entry_time: datetime
    entry_price: float
    exit_time: datetime | None = None
    exit_price: float | None = None
    exit_reason: str | None = None
    stop: float = 0.0
    target: float = 0.0
    quantity: int = 1
    pnl: float = 0.0  # USD, net of commission
    entry_reasons: list[str] = field(default_factory=list)


@dataclass
class BacktestResult:
    trades: list[TradeRecord]
    stats: dict

    def summary(self) -> str:
        s = self.stats
        lines = [
            f"bars:            {s['bars']}",
            f"sessions:        {s['sessions']}",
            f"trades:          {s['trades']}",
            f"win rate:        {s['win_rate']:.1%}" if s["trades"] else "win rate:        n/a",
            f"total pnl:       {s['total_pnl']:.2f} USD",
            f"avg win:         {s['avg_win']:.2f} USD",
            f"avg loss:        {s['avg_loss']:.2f} USD",
            f"profit factor:   {s['profit_factor']:.2f}" if s["profit_factor"] else "profit factor:   n/a",
            f"max drawdown:    {s['max_drawdown']:.2f} USD",
        ]
        return "\n".join(lines)


class Backtester:
    def __init__(
        self,
        cfg: IntradayConfig,
        commission_per_side: float = 0.62,  # IBKR micro future per contract
        slippage_ticks: float = 1.0,
    ) -> None:
        self.cfg = cfg
        self.commission_per_side = commission_per_side
        self.slippage = slippage_ticks * cfg.tick_size

    # -- helpers ------------------------------------------------------------

    def _local(self, ts) -> datetime:
        ts = pd.Timestamp(ts)
        if ts.tzinfo is not None:
            ts = ts.tz_convert(self.cfg.market_tz)
        return ts.to_pydatetime()

    def _pnl(self, side: str, entry: float, exit_: float, qty: int) -> float:
        points = (exit_ - entry) if side == LONG else (entry - exit_)
        gross = points * self.cfg.point_value * qty
        return gross - 2 * self.commission_per_side * qty

    # -- main loop ----------------------------------------------------------

    def run(self, df: pd.DataFrame) -> BacktestResult:
        cfg = self.cfg
        frame = compute_indicators(df, cfg)
        day_state = DayState()
        trades: list[TradeRecord] = []
        open_trade: TradeRecord | None = None
        pending_entry: tuple[str, list[str]] | None = None  # fills next bar open
        pending_exit_reason: str | None = None

        sessions = set()
        for i in range(len(frame)):
            row = frame.iloc[i]
            ts = self._local(frame.index[i])
            day_state.roll(ts.date())
            sessions.add(ts.date())
            new_session = open_trade is not None and open_trade.entry_time.date() != ts.date()

            # 0. a session boundary with a position still open (data gap):
            #    close it at the previous session's last close.
            if new_session and open_trade is not None:
                prev_close = float(frame["close"].iloc[i - 1])
                self._close(open_trade, self._local(frame.index[i - 1]), prev_close, "session end", day_state)
                trades.append(open_trade)
                open_trade = None
                pending_exit_reason = None
            if new_session:
                pending_entry = None

            # 1. fill pending exit at this bar's open
            if open_trade is not None and pending_exit_reason is not None:
                price = float(row["open"])
                price -= self.slippage if open_trade.side == LONG else -self.slippage
                self._close(open_trade, ts, price, pending_exit_reason, day_state)
                trades.append(open_trade)
                open_trade = None
                pending_exit_reason = None

            # 2. fill pending entry at this bar's open
            if open_trade is None and pending_entry is not None:
                side, reasons = pending_entry
                pending_entry = None
                if can_enter_now(ts, cfg) and day_state.can_trade(cfg):
                    price = float(row["open"])
                    price += self.slippage if side == LONG else -self.slippage
                    bar_atr = float(frame["atr"].iloc[i - 1])
                    stop, target = stop_and_target(price, side, bar_atr, cfg)
                    open_trade = TradeRecord(
                        side=side,
                        entry_time=ts,
                        entry_price=price,
                        stop=stop,
                        target=target,
                        quantity=cfg.quantity,
                        entry_reasons=reasons,
                    )

            # 3. manage the open position on this bar
            if open_trade is not None:
                hi, lo, close = float(row["high"]), float(row["low"]), float(row["close"])
                exited = False
                if open_trade.side == LONG:
                    if lo <= open_trade.stop:  # stop first: conservative
                        self._close(open_trade, ts, open_trade.stop, "stop loss", day_state)
                        exited = True
                    elif hi >= open_trade.target:
                        self._close(open_trade, ts, open_trade.target, "take profit", day_state)
                        exited = True
                else:
                    if hi >= open_trade.stop:
                        self._close(open_trade, ts, open_trade.stop, "stop loss", day_state)
                        exited = True
                    elif lo <= open_trade.target:
                        self._close(open_trade, ts, open_trade.target, "take profit", day_state)
                        exited = True

                if exited:
                    trades.append(open_trade)
                    open_trade = None
                elif should_flatten(ts, cfg):
                    self._close(open_trade, ts, close, "session flatten", day_state)
                    trades.append(open_trade)
                    open_trade = None
                else:
                    reason = exit_signal(frame, i, open_trade.side)
                    if reason is not None:
                        pending_exit_reason = reason
                if open_trade is None:
                    pending_exit_reason = None

            # 4. look for a new entry signal on this completed bar
            if open_trade is None and pending_entry is None:
                if can_enter_now(ts, cfg) and day_state.can_trade(cfg):
                    sig = entry_signal(frame, i, cfg)
                    if sig is not None:
                        pending_entry = (sig.side, sig.reasons)

        # close anything still open at the end of data
        if open_trade is not None:
            last_ts = self._local(frame.index[-1])
            self._close(open_trade, last_ts, float(frame["close"].iloc[-1]), "end of data", day_state)
            trades.append(open_trade)

        stats = self._stats(frame, trades, len(sessions))
        return BacktestResult(trades=trades, stats=stats)

    def _close(
        self,
        trade: TradeRecord,
        ts: datetime,
        price: float,
        reason: str,
        day_state: DayState,
    ) -> None:
        trade.exit_time = ts
        trade.exit_price = price
        trade.exit_reason = reason
        trade.pnl = self._pnl(trade.side, trade.entry_price, price, trade.quantity)
        day_state.record_trade(trade.pnl)

    def _stats(self, frame: pd.DataFrame, trades: list[TradeRecord], sessions: int) -> dict:
        pnls = [t.pnl for t in trades]
        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p <= 0]
        equity = pd.Series(pnls).cumsum() if pnls else pd.Series(dtype=float)
        drawdown = (equity - equity.cummax()).min() if len(equity) else 0.0
        gross_win = sum(wins)
        gross_loss = -sum(losses)
        return {
            "bars": len(frame),
            "sessions": sessions,
            "trades": len(trades),
            "win_rate": (len(wins) / len(trades)) if trades else 0.0,
            "total_pnl": sum(pnls),
            "avg_win": (gross_win / len(wins)) if wins else 0.0,
            "avg_loss": (-gross_loss / len(losses)) if losses else 0.0,
            "profit_factor": (gross_win / gross_loss) if gross_loss > 0 else 0.0,
            "max_drawdown": float(drawdown),
        }


def load_csv(path: str, tz: str = "America/New_York") -> pd.DataFrame:
    """Load OHLCV bars from CSV with columns: datetime,open,high,low,close,volume."""
    df = pd.read_csv(path)
    cols = {c.lower().strip(): c for c in df.columns}
    dt_col = next((cols[k] for k in ("datetime", "date", "time", "timestamp") if k in cols), None)
    if dt_col is None:
        raise ValueError("CSV needs a datetime/date/time/timestamp column")
    df[dt_col] = pd.to_datetime(df[dt_col])
    df = df.set_index(dt_col).sort_index()
    if df.index.tz is None:
        df.index = df.index.tz_localize(tz)
    df = df.rename(columns={cols[k]: k for k in ("open", "high", "low", "close", "volume") if k in cols})
    missing = [c for c in ("open", "high", "low", "close", "volume") if c not in df.columns]
    if missing:
        raise ValueError(f"CSV missing columns: {missing}")
    return df[["open", "high", "low", "close", "volume"]].astype(float)
