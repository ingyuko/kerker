import type { Execution, OptionRight } from "./types";

/**
 * Stable identity for an option contract. Two executions with the same key
 * are the same tradable instrument and therefore match against each other.
 */
export function contractKey(c: {
  underlying: string;
  expiry: string;
  strike: number;
  right: OptionRight;
}): string {
  return [
    c.underlying.toUpperCase(),
    c.expiry,
    // Fixed precision so 500 and 500.0 never produce different keys.
    c.strike.toFixed(4),
    c.right,
  ].join("|");
}

export function parseContractKey(key: string) {
  const [underlying, expiry, strike, right] = key.split("|");
  return {
    underlying,
    expiry,
    strike: Number(strike),
    right: right as OptionRight,
  };
}

/** Human label: `SPY 250919 500C`. */
export function contractLabel(c: {
  underlying: string;
  expiry: string;
  strike: number;
  right: OptionRight;
}): string {
  const [y, m, d] = c.expiry.split("-");
  const strike = Number.isInteger(c.strike)
    ? String(c.strike)
    : String(c.strike).replace(/0+$/, "").replace(/\.$/, "");
  return `${c.underlying.toUpperCase()} ${y.slice(2)}${m}${d} ${strike}${c.right}`;
}

const MARKET_TZ = "America/New_York";

/**
 * The US market date for an instant, as YYYY-MM-DD. Daily P&L buckets by this
 * rather than by local time, so a trade placed at 22:00 Taipei on the 9th
 * books to the 9th in New York, not the 10th.
 */
export function marketDate(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`marketDate: invalid date ${String(instant)}`);
  }
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Days until expiry, counted in market dates. Negative once expired. */
export function daysToExpiry(expiry: string, from = new Date()): number {
  const today = marketDate(from);
  const a = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(expiry.slice(0, 4)),
    Number(expiry.slice(5, 7)) - 1,
    Number(expiry.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

/** Signed contract count: BUY adds, SELL subtracts. */
export function signedQuantity(e: Pick<Execution, "side" | "quantity">): number {
  return e.side === "BUY" ? e.quantity : -e.quantity;
}

/** Cash flow of a fill: negative when buying (debit), positive when selling. */
export function cashFlow(
  e: Pick<Execution, "side" | "quantity" | "price" | "multiplier" | "fees">,
): number {
  const premium = e.price * e.quantity * e.multiplier;
  return (e.side === "SELL" ? premium : -premium) - e.fees;
}
