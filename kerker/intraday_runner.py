"""Live loop for the intraday TTM Squeeze + MACD + RSI futures bot.

Bar-driven: the bot only acts when a bar completes, using the exact same
signal functions as the backtester. Two modes:

* ``dry_run=True`` (default): no orders are sent. Entries/exits are
  simulated at bar prices and logged, so you can watch the bot "trade"
  against live market data safely.
* ``dry_run=False``: entries go out as market orders with an attached
  ATR stop-loss and take-profit (bracket); indicator exits and the
  end-of-session flatten cancel the bracket and close at market.

All timestamps compared against session times are *bar-start* times in
the configured market timezone, matching the backtester.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime

import pandas as pd
from ib_async import BarDataList, Contract, Trade, util

from .config import AppConfig, IntradayConfig
from .ibkr_client import IBKRClient
from .intraday_strategy import (
    LONG,
    SHORT,
    DayState,
    can_enter_now,
    compute_indicators,
    entry_signal,
    exit_signal,
    should_flatten,
    stop_and_target,
)

log = logging.getLogger(__name__)

MAX_LOOKBACK_BARS = 600  # plenty for 20-period studies on 5-min bars


@dataclass
class LivePosition:
    side: str
    quantity: int
    entry_price: float
    stop: float
    target: float
    entry_time: datetime
    parent_trade: Trade | None = None
    tp_trade: Trade | None = None
    sl_trade: Trade | None = None


class IntradayEngine:
    def __init__(self, client: IBKRClient, contract: Contract, cfg: IntradayConfig) -> None:
        self.client = client
        self.contract = contract
        self.cfg = cfg
        self.day_state = DayState()
        self.position: LivePosition | None = None
        self._order_seq = 0

    # ----- helpers -----

    def _ref(self) -> str:
        self._order_seq += 1
        return f"IDT-{self.cfg.symbol}-{self._order_seq}"

    def _gross_pnl(self, side: str, entry: float, exit_: float, qty: int) -> float:
        points = (exit_ - entry) if side == LONG else (entry - exit_)
        return points * self.cfg.point_value * qty

    def _record_exit(self, price: float, reason: str) -> None:
        pos = self.position
        assert pos is not None
        pnl = self._gross_pnl(pos.side, pos.entry_price, price, pos.quantity)
        self.day_state.record_trade(pnl)
        log.info(
            "EXIT %s %s @ %.2f (%s) pnl=%.2f USD | today: trades=%d pnl=%.2f",
            pos.side, self.cfg.symbol, price, reason, pnl,
            self.day_state.trades, self.day_state.realized_pnl,
        )
        self.position = None

    # ----- one step per completed bar -----

    async def on_completed_bar(self, frame: pd.DataFrame) -> None:
        i = len(frame) - 1
        ts: datetime = frame.index[i].to_pydatetime()
        row = frame.iloc[i]
        self.day_state.roll(ts.date())

        if self.position is not None:
            await self._manage_position(frame, i, ts, row)
        if self.position is None and can_enter_now(ts, self.cfg):
            await self._maybe_enter(frame, i, ts, row)

    async def _manage_position(self, frame: pd.DataFrame, i: int, ts: datetime, row: pd.Series) -> None:
        pos = self.position
        assert pos is not None
        cfg = self.cfg

        if cfg.dry_run:
            hi, lo, close = float(row["high"]), float(row["low"]), float(row["close"])
            if pos.side == LONG and lo <= pos.stop:
                self._record_exit(pos.stop, "stop loss (sim)")
                return
            if pos.side == LONG and hi >= pos.target:
                self._record_exit(pos.target, "take profit (sim)")
                return
            if pos.side == SHORT and hi >= pos.stop:
                self._record_exit(pos.stop, "stop loss (sim)")
                return
            if pos.side == SHORT and lo <= pos.target:
                self._record_exit(pos.target, "take profit (sim)")
                return
            if should_flatten(ts, cfg):
                self._record_exit(close, "session flatten (sim)")
                return
            reason = exit_signal(frame, i, pos.side)
            if reason is not None:
                self._record_exit(close, f"{reason} (sim)")
            return

        # live mode: first see whether a bracket child already closed us out
        for trade, reason in ((pos.sl_trade, "stop loss"), (pos.tp_trade, "take profit")):
            if trade is not None and trade.orderStatus.status == "Filled":
                price = float(trade.orderStatus.avgFillPrice or row["close"])
                await self.client.cancel_open_orders(self.contract)
                self._record_exit(price, reason)
                return

        reason = None
        if should_flatten(ts, cfg):
            reason = "session flatten"
        else:
            reason = exit_signal(frame, i, pos.side)
        if reason is None:
            return

        await self.client.cancel_open_orders(self.contract)
        signed = pos.quantity if pos.side == LONG else -pos.quantity
        trade = await self.client.close_position_market(self.contract, signed, self._ref())
        price = float(row["close"])
        if trade is not None and trade.orderStatus.avgFillPrice:
            price = float(trade.orderStatus.avgFillPrice)
        self._record_exit(price, reason)

    async def _maybe_enter(self, frame: pd.DataFrame, i: int, ts: datetime, row: pd.Series) -> None:
        cfg = self.cfg
        if not self.day_state.can_trade(cfg):
            log.info("entries halted: %s", "; ".join(self.day_state.halted_reasons))
            return
        sig = entry_signal(frame, i, cfg)
        if sig is None:
            return

        ref_price = float(row["close"])
        stop, target = stop_and_target(ref_price, sig.side, float(row["atr"]), cfg)
        log.info(
            "ENTRY signal %s %s @ ~%.2f stop=%.2f target=%.2f | %s",
            sig.side, cfg.symbol, ref_price, stop, target, "; ".join(sig.reasons),
        )

        if cfg.dry_run:
            self.position = LivePosition(
                side=sig.side, quantity=cfg.quantity, entry_price=ref_price,
                stop=stop, target=target, entry_time=ts,
            )
            log.info("dry-run: simulated fill @ %.2f (no order sent)", ref_price)
            return

        action = "BUY" if sig.side == LONG else "SELL"
        parent, tp, sl = await self.client.place_bracket(
            self.contract, action, cfg.quantity, stop, target, self._ref()
        )
        if parent.orderStatus.status != "Filled":
            log.warning("parent order not filled (status=%s); cancelling bracket", parent.orderStatus.status)
            await self.client.cancel_open_orders(self.contract)
            return
        fill = float(parent.orderStatus.avgFillPrice or ref_price)
        self.position = LivePosition(
            side=sig.side, quantity=cfg.quantity, entry_price=fill,
            stop=stop, target=target, entry_time=ts,
            parent_trade=parent, tp_trade=tp, sl_trade=sl,
        )
        log.info("filled %s @ %.2f", sig.side, fill)


def bars_to_frame(bars: BarDataList, tz: str, drop_last: bool = True) -> pd.DataFrame:
    """Bars as an OHLCV frame with a tz-aware index.

    With ``drop_last=True`` (streaming mode) the still-forming last bar is
    excluded so the strategy only ever sees completed bars.
    """
    data = bars[:-1] if drop_last else bars[:]
    df = util.df(data)
    if df is None or df.empty:
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
    df = df.set_index("date")
    df.index = pd.DatetimeIndex(df.index)
    if df.index.tz is None:
        df.index = df.index.tz_localize("UTC")
    df.index = df.index.tz_convert(tz)
    df = df[["open", "high", "low", "close", "volume"]].astype(float)
    return df.tail(MAX_LOOKBACK_BARS)


async def fetch_history_frame(cfg: AppConfig, duration: str | None = None) -> pd.DataFrame:
    """One-shot historical download (for backtesting against IBKR data)."""
    icfg = cfg.intraday
    client = IBKRClient(cfg.ibkr)
    await client.connect()
    try:
        contract = await client.qualify_front_future(icfg.symbol, icfg.exchange)
        bars = await client.ib.reqHistoricalDataAsync(
            contract,
            endDateTime="",
            durationStr=duration or icfg.history_duration,
            barSizeSetting=icfg.bar_size,
            whatToShow="TRADES",
            useRTH=icfg.use_rth,
            formatDate=2,
        )
        if not bars:
            raise RuntimeError("no historical bars returned")
        return bars_to_frame(bars, icfg.market_tz, drop_last=False)
    finally:
        await client.disconnect()


async def run_intraday(cfg: AppConfig) -> None:
    icfg = cfg.intraday
    client = IBKRClient(cfg.ibkr)
    await client.connect()
    try:
        contract = await client.qualify_front_future(icfg.symbol, icfg.exchange)

        existing = client.position_for(contract)
        if existing != 0 and not icfg.dry_run:
            raise RuntimeError(
                f"existing position of {existing} {icfg.symbol} detected - "
                "flatten it manually before starting the bot in live mode"
            )

        log.info(
            "intraday bot on %s (%s) bar=%s dry_run=%s qty=%d",
            contract.localSymbol, icfg.exchange, icfg.bar_size, icfg.dry_run, icfg.quantity,
        )
        bars = await client.streaming_bars(
            contract, icfg.history_duration, icfg.bar_size, icfg.use_rth
        )
        engine = IntradayEngine(client, contract, icfg)

        bar_event = asyncio.Event()

        def _on_update(_bars, has_new_bar: bool) -> None:
            if has_new_bar:
                bar_event.set()

        bars.updateEvent += _on_update

        last_processed = None
        while True:
            frame = bars_to_frame(bars, icfg.market_tz)
            if len(frame) > 2 and frame.index[-1] != last_processed:
                frame = compute_indicators(frame, icfg)
                await engine.on_completed_bar(frame)
                last_processed = frame.index[-1]

            # wait until keepUpToDate appends the next bar
            await bar_event.wait()
            bar_event.clear()
    finally:
        await client.disconnect()
