from __future__ import annotations

import logging
from dataclasses import dataclass

from .config import StrategyConfig
from .ibkr_client import IBKRClient, _pick_price

log = logging.getLogger(__name__)


@dataclass
class SpreadCandidate:
    expiry: str
    short_strike: float
    long_strike: float
    short_delta: float
    short_mid: float
    long_mid: float
    credit: float
    width: float
    exchange: str
    trading_class: str

    @property
    def credit_ratio(self) -> float:
        return self.credit / self.width if self.width else 0.0


@dataclass
class FilterResult:
    passed: bool
    reasons: list[str]


def evaluate_market_filters(
    spy_price: float,
    spy_prev_close: float,
    vix: float,
    cfg: StrategyConfig,
) -> FilterResult:
    """Pre-trade filters: trend + IV regime."""
    reasons: list[str] = []
    if cfg.require_above_prev_close and spy_price <= spy_prev_close:
        reasons.append(f"SPY {spy_price:.2f} <= prev close {spy_prev_close:.2f}")
    if vix > cfg.vix_max:
        reasons.append(f"VIX {vix:.2f} > max {cfg.vix_max}")
    if vix < cfg.vix_min:
        reasons.append(f"VIX {vix:.2f} < min {cfg.vix_min}")
    return FilterResult(passed=not reasons, reasons=reasons)


def pick_short_strike(
    deltas_by_strike: dict[float, float],
    target_delta: float,
) -> float | None:
    """Pick the put strike whose absolute delta is closest to target_delta.

    Put deltas are negative; we compare on absolute value.
    """
    if not deltas_by_strike:
        return None
    best: tuple[float, float] | None = None  # (|d - target|, strike)
    for strike, delta in deltas_by_strike.items():
        if delta is None:
            continue
        diff = abs(abs(delta) - target_delta)
        if best is None or diff < best[0]:
            best = (diff, strike)
    return best[1] if best else None


def pick_long_strike(short_strike: float, available: list[float], width: float) -> float | None:
    """Pick the long-leg put strike closest to short_strike - width, but strictly below short_strike."""
    target = short_strike - width
    candidates = [s for s in available if s < short_strike]
    if not candidates:
        return None
    candidates.sort(key=lambda s: abs(s - target))
    return candidates[0]


class BullPutSpreadStrategy:
    def __init__(self, client: IBKRClient, cfg: StrategyConfig) -> None:
        self.client = client
        self.cfg = cfg

    async def scan_and_trade(self) -> dict:
        """Run one scan; place an order if all filters pass. Returns a summary dict."""
        cfg = self.cfg
        symbol = cfg.symbol

        # 1. underlying + VIX context
        underlying = await self.client.qualify_stock(symbol)
        vix_idx = await self.client.qualify_index("VIX", "CBOE")

        spy_price = await self.client.get_last_price(underlying)
        vix_price = await self.client.get_last_price(vix_idx)
        spy_prev_close = await self.client.get_prev_close(underlying)

        market = evaluate_market_filters(spy_price, spy_prev_close, vix_price, cfg)
        log.info(
            "market: SPY=%.2f prev_close=%.2f VIX=%.2f passed=%s reasons=%s",
            spy_price, spy_prev_close, vix_price, market.passed, market.reasons,
        )
        if not market.passed:
            return {"action": "skip", "stage": "market_filter", "reasons": market.reasons}

        # 2. option chain -> expiry
        chain_params = await self.client.option_chain(underlying)
        smart_chain = next(
            (c for c in chain_params if c.exchange == "SMART" and c.tradingClass == symbol),
            chain_params[0] if chain_params else None,
        )
        if smart_chain is None:
            return {"action": "skip", "stage": "chain", "reasons": ["no chain returned"]}

        expiry = self.client.pick_expiry(smart_chain.expirations, cfg.dte_min, cfg.dte_max)
        if expiry is None:
            return {
                "action": "skip",
                "stage": "expiry",
                "reasons": [f"no expiry in [{cfg.dte_min}, {cfg.dte_max}] DTE"],
            }

        # 3. narrow strike search to ~10% below spot
        all_strikes = sorted(float(s) for s in smart_chain.strikes)
        lower = spy_price * 0.85
        upper = spy_price * 0.99
        candidate_strikes = [s for s in all_strikes if lower <= s <= upper]
        if len(candidate_strikes) < 2:
            return {"action": "skip", "stage": "strikes", "reasons": ["too few candidate strikes"]}

        greeks = await self.client.get_put_greeks(
            symbol, expiry, candidate_strikes, smart_chain.exchange, smart_chain.tradingClass
        )
        deltas: dict[float, float] = {}
        mids: dict[float, float] = {}
        for strike, ticker in greeks.items():
            mg = ticker.modelGreeks
            if mg is None or mg.delta is None:
                continue
            deltas[strike] = float(mg.delta)
            mid = _mid(ticker)
            if mid is not None:
                mids[strike] = mid

        short_strike = pick_short_strike(deltas, cfg.short_put_delta)
        if short_strike is None:
            return {"action": "skip", "stage": "short_strike", "reasons": ["no delta data"]}

        long_strike = pick_long_strike(short_strike, list(mids.keys()), cfg.spread_width)
        if long_strike is None:
            return {"action": "skip", "stage": "long_strike", "reasons": ["no long strike below short"]}

        if short_strike not in mids or long_strike not in mids:
            return {
                "action": "skip",
                "stage": "pricing",
                "reasons": [f"missing mid: short={short_strike in mids} long={long_strike in mids}"],
            }

        credit = mids[short_strike] - mids[long_strike]
        width = short_strike - long_strike
        candidate = SpreadCandidate(
            expiry=expiry,
            short_strike=short_strike,
            long_strike=long_strike,
            short_delta=deltas[short_strike],
            short_mid=mids[short_strike],
            long_mid=mids[long_strike],
            credit=credit,
            width=width,
            exchange=smart_chain.exchange,
            trading_class=smart_chain.tradingClass,
        )
        log.info(
            "candidate: %s short=%s(d=%.3f, mid=%.2f) long=%s(mid=%.2f) credit=%.2f width=%.2f ratio=%.2f",
            candidate.expiry, candidate.short_strike, candidate.short_delta, candidate.short_mid,
            candidate.long_strike, candidate.long_mid, candidate.credit, candidate.width, candidate.credit_ratio,
        )

        if candidate.credit <= 0:
            return {"action": "skip", "stage": "credit", "reasons": ["non-positive credit"], "candidate": candidate.__dict__}
        if candidate.credit_ratio < cfg.min_credit_ratio:
            return {
                "action": "skip",
                "stage": "credit_ratio",
                "reasons": [f"credit ratio {candidate.credit_ratio:.2f} < {cfg.min_credit_ratio}"],
                "candidate": candidate.__dict__,
            }

        # 4. place order
        trade = await self.client.place_bull_put_spread(
            underlying_symbol=symbol,
            expiry=candidate.expiry,
            short_strike=candidate.short_strike,
            long_strike=candidate.long_strike,
            exchange=candidate.exchange,
            trading_class=candidate.trading_class,
            credit_limit=candidate.credit,
            quantity=cfg.quantity,
            transmit=cfg.transmit,
        )
        return {
            "action": "order_placed",
            "transmit": cfg.transmit,
            "candidate": candidate.__dict__,
            "order_id": trade.order.orderId,
            "status": trade.orderStatus.status,
        }


def _mid(ticker) -> float | None:
    bid = getattr(ticker, "bid", None)
    ask = getattr(ticker, "ask", None)
    if bid and ask and bid > 0 and ask > 0:
        return round((bid + ask) / 2, 2)
    return _pick_price(ticker)
