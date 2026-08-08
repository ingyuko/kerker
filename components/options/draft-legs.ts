import type { ExecutionInput, ExecutionKind, OptionRight, Side } from "@/lib/options/types";

/**
 * A leg as the form holds it: every numeric field stays a string so a
 * half-typed "1." doesn't get coerced to 1 under the user's fingers.
 */
export interface DraftLeg {
  key: string;
  underlying: string;
  /** YYYY-MM-DD, matching <input type="date">. */
  expiry: string;
  strike: string;
  right: OptionRight;
  side: Side;
  quantity: string;
  price: string;
  fees: string;
  /** YYYY-MM-DDTHH:mm in local time, matching <input type="datetime-local">. */
  tradedAt: string;
  kind: ExecutionKind;
  /** Present only on legs read from a screenshot. */
  confidence?: number;
  sourceText?: string;
}

let counter = 0;
function nextKey(): string {
  counter += 1;
  return `leg-${counter}`;
}

/** `YYYY-MM-DDTHH:mm` for the local clock, the format datetime-local wants. */
export function localDateTimeValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

export function blankLeg(seed: Partial<DraftLeg> = {}): DraftLeg {
  return {
    key: nextKey(),
    underlying: "",
    expiry: "",
    strike: "",
    right: "P",
    side: "SELL",
    quantity: "1",
    price: "",
    fees: "",
    tradedAt: localDateTimeValue(),
    kind: "TRADE",
    ...seed,
  };
}

/**
 * Converts a screenshot-parsed leg to a draft. An empty parsed timestamp falls
 * back to now rather than blocking the save — the user can correct it.
 */
export function draftFromParsed(leg: {
  underlying: string;
  expiry: string;
  strike: number;
  right: OptionRight;
  side: Side;
  quantity: number;
  price: number;
  fees: number;
  tradedAt: string;
  kind: ExecutionKind;
  confidence: number;
  sourceText: string;
}): DraftLeg {
  const parsedAt = leg.tradedAt ? new Date(leg.tradedAt) : null;
  const tradedAt =
    parsedAt && !Number.isNaN(parsedAt.getTime())
      ? localDateTimeValue(parsedAt)
      : localDateTimeValue();

  return {
    key: nextKey(),
    underlying: leg.underlying,
    expiry: leg.expiry,
    strike: String(leg.strike),
    right: leg.right,
    side: leg.side,
    quantity: String(leg.quantity),
    price: leg.price ? String(leg.price) : "",
    fees: leg.fees ? String(leg.fees) : "",
    tradedAt,
    kind: leg.kind,
    confidence: leg.confidence,
    sourceText: leg.sourceText,
  };
}

/** Loads a saved execution back into the form for correction. */
export function draftFromExecution(execution: {
  underlying: string;
  expiry: string;
  strike: number;
  right: OptionRight;
  side: Side;
  quantity: number;
  price: number;
  fees: number;
  tradedAt: string;
  kind: ExecutionKind;
}): DraftLeg {
  return {
    key: nextKey(),
    underlying: execution.underlying,
    expiry: execution.expiry,
    strike: String(execution.strike),
    right: execution.right,
    side: execution.side,
    quantity: String(execution.quantity),
    price: String(execution.price),
    fees: execution.fees ? String(execution.fees) : "",
    tradedAt: localDateTimeValue(new Date(execution.tradedAt)),
    kind: execution.kind,
  };
}

export class DraftError extends Error {}

/**
 * Validates and converts drafts into API payloads. Legs saved together share a
 * groupId so a spread shows as one strategy in the record.
 */
export function toExecutionInputs(
  legs: DraftLeg[],
  options: { source: "manual" | "screenshot"; strategy?: string; note?: string },
): ExecutionInput[] {
  if (legs.length === 0) throw new DraftError("至少要有一腳交易。");

  const groupId = legs.length > 1 ? crypto.randomUUID() : null;

  return legs.map((leg, i) => {
    const where = legs.length > 1 ? `第 ${i + 1} 腳：` : "";

    const underlying = leg.underlying.trim().toUpperCase();
    if (!underlying) throw new DraftError(`${where}請填標的代號。`);
    if (!leg.expiry) throw new DraftError(`${where}請填到期日。`);

    const strike = Number(leg.strike);
    if (!Number.isFinite(strike) || strike <= 0) {
      throw new DraftError(`${where}履約價要是大於 0 的數字。`);
    }

    const quantity = Number(leg.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new DraftError(`${where}口數要是大於 0 的整數。`);
    }

    // A zero premium is legitimate for an expiry, so only reject it on a trade.
    const price = leg.price.trim() === "" ? 0 : Number(leg.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new DraftError(`${where}權利金要是不小於 0 的數字。`);
    }
    if (price === 0 && leg.kind === "TRADE") {
      throw new DraftError(
        `${where}成交的權利金不會是 0。若是到期作廢，請把類型改成「到期」。`,
      );
    }

    const fees = leg.fees.trim() === "" ? 0 : Number(leg.fees);
    if (!Number.isFinite(fees) || fees < 0) {
      throw new DraftError(`${where}手續費要是不小於 0 的數字。`);
    }

    const tradedAt = new Date(leg.tradedAt);
    if (Number.isNaN(tradedAt.getTime())) {
      throw new DraftError(`${where}成交時間格式不正確。`);
    }

    return {
      tradedAt: tradedAt.toISOString(),
      underlying,
      expiry: leg.expiry,
      strike,
      right: leg.right,
      side: leg.side,
      quantity,
      price,
      fees,
      multiplier: 100,
      kind: leg.kind,
      groupId,
      strategy: options.strategy?.trim() || null,
      note: options.note?.trim() || null,
      source: options.source,
    };
  });
}
