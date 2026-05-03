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
class AppConfig:
    ibkr: IBKRConfig
    strategy: StrategyConfig
    schedule: ScheduleConfig

    @classmethod
    def load(cls) -> "AppConfig":
        return cls(
            ibkr=IBKRConfig(),
            strategy=StrategyConfig(),
            schedule=ScheduleConfig(),
        )
