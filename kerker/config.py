from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _env(name: str, default: str) -> str:
    val = os.getenv(name)
    return val if val not in (None, "") else default


@dataclass(frozen=True)
class IBKRConfig:
    host: str = _env("IBKR_HOST", "127.0.0.1")
    port: int = int(_env("IBKR_PORT", "4002"))
    client_id: int = int(_env("IBKR_CLIENT_ID", "17"))
    account: str = _env("IBKR_ACCOUNT", "")


@dataclass(frozen=True)
class StrategyConfig:
    symbol: str = _env("BPS_SYMBOL", "SPY")
    dte_min: int = int(_env("BPS_DTE_MIN", "30"))
    dte_max: int = int(_env("BPS_DTE_MAX", "45"))
    short_put_delta: float = float(_env("BPS_SHORT_DELTA", "0.20"))
    spread_width: float = float(_env("BPS_SPREAD_WIDTH", "5"))
    min_credit_ratio: float = float(_env("BPS_MIN_CREDIT_RATIO", "0.25"))
    quantity: int = int(_env("BPS_QUANTITY", "1"))
    vix_min: float = float(_env("BPS_VIX_MIN", "12"))
    vix_max: float = float(_env("BPS_VIX_MAX", "28"))
    require_above_prev_close: bool = _env("BPS_REQUIRE_ABOVE_PREV_CLOSE", "1") == "1"
    transmit: bool = _env("BPS_TRANSMIT", "0") == "1"


@dataclass(frozen=True)
class ScheduleConfig:
    minutes_after_open: int = int(_env("BPS_MINUTES_AFTER_OPEN", "30"))
    market_tz: str = _env("BPS_MARKET_TZ", "America/New_York")


@dataclass(frozen=True)
class IntradayConfig:
    """TTM Squeeze + MACD + RSI intraday futures strategy."""

    # instrument
    symbol: str = _env("INTRADAY_SYMBOL", "MES")
    exchange: str = _env("INTRADAY_EXCHANGE", "CME")
    point_value: float = float(_env("INTRADAY_POINT_VALUE", "5"))  # MES=5, ES=50
    tick_size: float = float(_env("INTRADAY_TICK_SIZE", "0.25"))
    quantity: int = int(_env("INTRADAY_QUANTITY", "1"))

    # bars
    bar_size: str = _env("INTRADAY_BAR_SIZE", "5 mins")
    history_duration: str = _env("INTRADAY_HISTORY_DURATION", "3 D")
    use_rth: bool = _env("INTRADAY_USE_RTH", "1") == "1"

    # TTM Squeeze
    bb_length: int = int(_env("INTRADAY_BB_LENGTH", "20"))
    bb_mult: float = float(_env("INTRADAY_BB_MULT", "2.0"))
    kc_length: int = int(_env("INTRADAY_KC_LENGTH", "20"))
    kc_mult: float = float(_env("INTRADAY_KC_MULT", "1.5"))
    momentum_length: int = int(_env("INTRADAY_MOMENTUM_LENGTH", "20"))
    min_squeeze_bars: int = int(_env("INTRADAY_MIN_SQUEEZE_BARS", "4"))
    fire_lookback: int = int(_env("INTRADAY_FIRE_LOOKBACK", "3"))

    # MACD
    macd_fast: int = int(_env("INTRADAY_MACD_FAST", "12"))
    macd_slow: int = int(_env("INTRADAY_MACD_SLOW", "26"))
    macd_signal: int = int(_env("INTRADAY_MACD_SIGNAL", "9"))

    # RSI filter
    rsi_length: int = int(_env("INTRADAY_RSI_LENGTH", "14"))
    rsi_long_min: float = float(_env("INTRADAY_RSI_LONG_MIN", "50"))
    rsi_long_max: float = float(_env("INTRADAY_RSI_LONG_MAX", "75"))
    rsi_short_min: float = float(_env("INTRADAY_RSI_SHORT_MIN", "25"))
    rsi_short_max: float = float(_env("INTRADAY_RSI_SHORT_MAX", "50"))

    # VWAP trend filter
    use_vwap_filter: bool = _env("INTRADAY_USE_VWAP_FILTER", "1") == "1"

    # risk management
    atr_length: int = int(_env("INTRADAY_ATR_LENGTH", "14"))
    stop_atr_mult: float = float(_env("INTRADAY_STOP_ATR_MULT", "1.5"))
    target_atr_mult: float = float(_env("INTRADAY_TARGET_ATR_MULT", "2.5"))
    max_trades_per_day: int = int(_env("INTRADAY_MAX_TRADES_PER_DAY", "6"))
    max_daily_loss: float = float(_env("INTRADAY_MAX_DAILY_LOSS", "500"))  # USD

    # session (market tz); entries stop before the close, then flatten
    market_tz: str = _env("INTRADAY_MARKET_TZ", "America/New_York")
    session_start: str = _env("INTRADAY_SESSION_START", "09:30")
    session_end: str = _env("INTRADAY_SESSION_END", "16:00")
    warmup_minutes: int = int(_env("INTRADAY_WARMUP_MINUTES", "15"))
    no_entry_minutes: int = int(_env("INTRADAY_NO_ENTRY_MINUTES", "30"))
    flatten_minutes: int = int(_env("INTRADAY_FLATTEN_MINUTES", "10"))

    # safety: 1 = log signals only, 0 = place real orders on the gateway
    dry_run: bool = _env("INTRADAY_DRY_RUN", "1") == "1"


@dataclass(frozen=True)
class AppConfig:
    ibkr: IBKRConfig
    strategy: StrategyConfig
    schedule: ScheduleConfig
    intraday: IntradayConfig

    @classmethod
    def load(cls) -> "AppConfig":
        return cls(
            ibkr=IBKRConfig(),
            strategy=StrategyConfig(),
            schedule=ScheduleConfig(),
            intraday=IntradayConfig(),
        )
