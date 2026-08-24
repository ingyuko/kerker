from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import Iterable

from ib_async import (
    IB,
    BarData,
    BarDataList,
    ComboLeg,
    ContFuture,
    Contract,
    Future,
    Index,
    LimitOrder,
    MarketOrder,
    Option,
    Stock,
    StopOrder,
    Ticker,
    Trade,
)

from .config import IBKRConfig

log = logging.getLogger(__name__)


class IBKRClient:
    """Thin async wrapper around ib_async.IB for the bull put spread bot."""

    def __init__(self, cfg: IBKRConfig) -> None:
        self.cfg = cfg
        self.ib = IB()

    async def connect(self) -> None:
        log.info("connecting to IBKR %s:%s clientId=%s", self.cfg.host, self.cfg.port, self.cfg.client_id)
        await self.ib.connectAsync(self.cfg.host, self.cfg.port, clientId=self.cfg.client_id)
        if not self.ib.isConnected():
            raise RuntimeError("failed to connect to IBKR Gateway")
        accounts = self.ib.managedAccounts()
        log.info("connected. managed accounts=%s", accounts)
        if self.cfg.account and self.cfg.account not in accounts:
            log.warning("configured account %s not in managed accounts %s", self.cfg.account, accounts)

    async def disconnect(self) -> None:
        if self.ib.isConnected():
            self.ib.disconnect()

    # ----- market data helpers -----

    async def qualify_stock(self, symbol: str) -> Stock:
        contract = Stock(symbol, "SMART", "USD", primaryExchange="ARCA")
        await self.ib.qualifyContractsAsync(contract)
        return contract

    async def qualify_index(self, symbol: str, exchange: str = "CBOE") -> Index:
        contract = Index(symbol, exchange, "USD")
        await self.ib.qualifyContractsAsync(contract)
        return contract

    async def get_last_price(self, contract: Contract, timeout: float = 5.0) -> float:
        ticker = self.ib.reqMktData(contract, "", False, False)
        try:
            await self._wait_price(ticker, timeout)
            return _pick_price(ticker)
        finally:
            self.ib.cancelMktData(contract)

    async def get_prev_close(self, contract: Contract) -> float:
        bars: list[BarData] = await self.ib.reqHistoricalDataAsync(
            contract,
            endDateTime="",
            durationStr="2 D",
            barSizeSetting="1 day",
            whatToShow="TRADES",
            useRTH=True,
            formatDate=1,
        )
        if len(bars) < 2:
            raise RuntimeError(f"not enough bars to compute prev close for {contract.symbol}")
        return float(bars[-2].close)

    # ----- futures (intraday bot) -----

    async def qualify_front_future(self, symbol: str, exchange: str = "CME") -> Future:
        """Resolve the current front-month future via the continuous contract."""
        cont = ContFuture(symbol, exchange, currency="USD")
        await self.ib.qualifyContractsAsync(cont)
        if not cont.conId:
            raise RuntimeError(f"could not qualify continuous future {symbol}@{exchange}")
        fut = Future(conId=cont.conId, exchange=exchange, currency="USD")
        await self.ib.qualifyContractsAsync(fut)
        if not fut.conId:
            raise RuntimeError(f"could not qualify front-month future for {symbol}")
        log.info("front future: %s %s conId=%s", fut.localSymbol, fut.lastTradeDateOrContractMonth, fut.conId)
        return fut

    async def streaming_bars(
        self,
        contract: Contract,
        duration: str,
        bar_size: str,
        use_rth: bool,
    ) -> BarDataList:
        """Historical bars that keep updating in real time (keepUpToDate)."""
        bars = await self.ib.reqHistoricalDataAsync(
            contract,
            endDateTime="",
            durationStr=duration,
            barSizeSetting=bar_size,
            whatToShow="TRADES",
            useRTH=use_rth,
            formatDate=2,
            keepUpToDate=True,
        )
        if not bars:
            raise RuntimeError(f"no historical bars for {contract.localSymbol or contract.symbol}")
        return bars

    async def place_bracket(
        self,
        contract: Contract,
        action: str,  # "BUY" to open long, "SELL" to open short
        quantity: int,
        stop_price: float,
        target_price: float,
        order_ref: str,
    ) -> tuple[Trade, Trade, Trade]:
        """Market entry with an attached stop-loss and take-profit.

        The two children share the parent, so IBKR cancels one when the
        other fills (native OCA behaviour of bracket orders).
        """
        reverse = "SELL" if action == "BUY" else "BUY"

        parent = MarketOrder(action, quantity)
        parent.orderId = self.ib.client.getReqId()
        parent.transmit = False
        parent.orderRef = order_ref

        take_profit = LimitOrder(reverse, quantity, round(target_price, 2))
        take_profit.orderId = self.ib.client.getReqId()
        take_profit.parentId = parent.orderId
        take_profit.transmit = False
        take_profit.orderRef = f"{order_ref}-TP"

        stop_loss = StopOrder(reverse, quantity, round(stop_price, 2))
        stop_loss.orderId = self.ib.client.getReqId()
        stop_loss.parentId = parent.orderId
        stop_loss.transmit = True  # transmitting the last child sends all three
        stop_loss.orderRef = f"{order_ref}-SL"

        for order in (parent, take_profit, stop_loss):
            order.tif = "DAY"
            if self.cfg.account:
                order.account = self.cfg.account

        parent_trade = self.ib.placeOrder(contract, parent)
        tp_trade = self.ib.placeOrder(contract, take_profit)
        sl_trade = self.ib.placeOrder(contract, stop_loss)

        for _ in range(40):
            await asyncio.sleep(0.25)
            if parent_trade.orderStatus.status in {"Filled", "Cancelled", "Inactive"}:
                break
        log.info(
            "bracket %s: parent=%s tp=%s sl=%s",
            order_ref,
            parent_trade.orderStatus.status,
            tp_trade.orderStatus.status,
            sl_trade.orderStatus.status,
        )
        return parent_trade, tp_trade, sl_trade

    async def close_position_market(self, contract: Contract, position: int, order_ref: str) -> Trade | None:
        """Flatten ``position`` (signed contracts) with a market order."""
        if position == 0:
            return None
        action = "SELL" if position > 0 else "BUY"
        order = MarketOrder(action, abs(position))
        order.orderRef = order_ref
        order.tif = "DAY"
        if self.cfg.account:
            order.account = self.cfg.account
        trade = self.ib.placeOrder(contract, order)
        for _ in range(40):
            await asyncio.sleep(0.25)
            if trade.orderStatus.status in {"Filled", "Cancelled", "Inactive"}:
                break
        log.info("close %s status=%s", order_ref, trade.orderStatus.status)
        return trade

    async def cancel_open_orders(self, contract: Contract) -> None:
        for trade in list(self.ib.openTrades()):
            if trade.contract.conId == contract.conId and trade.orderStatus.status not in {
                "Filled",
                "Cancelled",
                "Inactive",
            }:
                self.ib.cancelOrder(trade.order)
        await asyncio.sleep(0.5)

    def position_for(self, contract: Contract) -> int:
        for pos in self.ib.positions():
            if pos.contract.conId == contract.conId:
                return int(pos.position)
        return 0

    # ----- option chain -----

    async def option_chain(self, underlying: Contract) -> list:
        params = await self.ib.reqSecDefOptParamsAsync(
            underlyingSymbol=underlying.symbol,
            futFopExchange="",
            underlyingSecType=underlying.secType,
            underlyingConId=underlying.conId,
        )
        return params

    @staticmethod
    def pick_expiry(expirations: Iterable[str], dte_min: int, dte_max: int, today: date | None = None) -> str | None:
        today = today or date.today()
        candidates: list[tuple[int, str]] = []
        for exp in expirations:
            try:
                d = datetime.strptime(exp, "%Y%m%d").date()
            except ValueError:
                continue
            dte = (d - today).days
            if dte_min <= dte <= dte_max:
                candidates.append((dte, exp))
        if not candidates:
            return None
        # prefer the closest expiry to the midpoint of the window
        target = (dte_min + dte_max) / 2
        candidates.sort(key=lambda x: abs(x[0] - target))
        return candidates[0][1]

    async def get_put_greeks(self, symbol: str, expiry: str, strikes: list[float], exchange: str, trading_class: str) -> dict[float, Ticker]:
        contracts = [
            Option(symbol, expiry, strike, "P", exchange, tradingClass=trading_class, currency="USD")
            for strike in strikes
        ]
        await self.ib.qualifyContractsAsync(*contracts)
        contracts = [c for c in contracts if c.conId]
        tickers = [self.ib.reqMktData(c, "", False, False) for c in contracts]
        # wait for greeks
        deadline = asyncio.get_event_loop().time() + 10.0
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(0.5)
            if all(_has_model(t) for t in tickers):
                break
        result: dict[float, Ticker] = {}
        for c, t in zip(contracts, tickers):
            result[float(c.strike)] = t
        for c in contracts:
            self.ib.cancelMktData(c)
        return result

    # ----- order placement -----

    async def place_bull_put_spread(
        self,
        underlying_symbol: str,
        expiry: str,
        short_strike: float,
        long_strike: float,
        exchange: str,
        trading_class: str,
        credit_limit: float,
        quantity: int,
        transmit: bool,
    ) -> Trade:
        short_put = Option(underlying_symbol, expiry, short_strike, "P", exchange, tradingClass=trading_class, currency="USD")
        long_put = Option(underlying_symbol, expiry, long_strike, "P", exchange, tradingClass=trading_class, currency="USD")
        await self.ib.qualifyContractsAsync(short_put, long_put)
        if not short_put.conId or not long_put.conId:
            raise RuntimeError("could not qualify spread legs")

        bag = Contract(
            symbol=underlying_symbol,
            secType="BAG",
            exchange=exchange,
            currency="USD",
            comboLegs=[
                ComboLeg(conId=short_put.conId, ratio=1, action="SELL", exchange=exchange),
                ComboLeg(conId=long_put.conId, ratio=1, action="BUY", exchange=exchange),
            ],
        )

        # For a credit spread modelled as SELL combo, a positive limit price is the credit.
        order = LimitOrder("BUY", quantity, -abs(round(credit_limit, 2)))
        order.orderRef = f"BPS-{underlying_symbol}-{expiry}-{int(short_strike)}/{int(long_strike)}"
        order.tif = "DAY"
        order.transmit = transmit
        if self.cfg.account:
            order.account = self.cfg.account

        trade = self.ib.placeOrder(bag, order)
        # let IBKR ack
        for _ in range(20):
            await asyncio.sleep(0.25)
            if trade.orderStatus.status in {"Submitted", "PreSubmitted", "Filled", "Cancelled", "Inactive"}:
                break
        log.info("placed %s status=%s id=%s", order.orderRef, trade.orderStatus.status, trade.order.orderId)
        return trade

    # ----- internals -----

    async def _wait_price(self, ticker: Ticker, timeout: float) -> None:
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(0.25)
            if _pick_price(ticker) is not None:
                return
        raise TimeoutError(f"no price for {ticker.contract.symbol} within {timeout}s")


def _pick_price(ticker: Ticker) -> float | None:
    for p in (ticker.last, ticker.marketPrice(), ticker.close):
        try:
            if p is not None and not _is_nan(p):
                return float(p)
        except Exception:
            continue
    return None


def _has_model(ticker: Ticker) -> bool:
    mg = ticker.modelGreeks
    return mg is not None and mg.delta is not None and not _is_nan(mg.delta)


def _is_nan(x) -> bool:
    try:
        return x != x  # NaN check
    except Exception:
        return False
