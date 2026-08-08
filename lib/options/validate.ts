import type { ExecutionInput, ExecutionKind, OptionRight, Side } from "./types";

/**
 * Hand-rolled validation for execution payloads. These numbers drive money
 * calculations, so every field is checked and coerced rather than trusted —
 * whether it came from the manual form, a screenshot parse, or a stale client.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SIDES: Side[] = ["BUY", "SELL"];
const RIGHTS: OptionRight[] = ["C", "P"];
const KINDS: ExecutionKind[] = ["TRADE", "EXPIRE", "ASSIGN", "EXERCISE"];

function num(value: unknown, field: string): number {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new ValidationError(`${field} must be a number (got ${String(value)})`);
  }
  return n;
}

function str(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function optionalStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function isoDate(value: unknown, field: string): string {
  const s = str(value, field);
  if (!DATE_RE.test(s)) {
    throw new ValidationError(`${field} must be formatted YYYY-MM-DD (got ${s})`);
  }
  if (Number.isNaN(Date.parse(`${s}T00:00:00Z`))) {
    throw new ValidationError(`${field} is not a real date (got ${s})`);
  }
  return s;
}

/** Accepts a payload from any source and returns a safe ExecutionInput. */
export function parseExecutionInput(raw: unknown): ExecutionInput {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("Execution payload must be an object");
  }
  const r = raw as Record<string, unknown>;

  const tradedAtRaw = str(r.tradedAt, "tradedAt");
  const tradedAtMs = Date.parse(tradedAtRaw);
  if (Number.isNaN(tradedAtMs)) {
    throw new ValidationError(`tradedAt is not a valid timestamp (${tradedAtRaw})`);
  }

  const side = str(r.side, "side").toUpperCase() as Side;
  if (!SIDES.includes(side)) {
    throw new ValidationError(`side must be BUY or SELL (got ${side})`);
  }

  const right = str(r.right, "right").toUpperCase() as OptionRight;
  if (!RIGHTS.includes(right)) {
    throw new ValidationError(`right must be C or P (got ${right})`);
  }

  const kind = (
    r.kind === undefined || r.kind === null
      ? "TRADE"
      : String(r.kind).toUpperCase()
  ) as ExecutionKind;
  if (!KINDS.includes(kind)) {
    throw new ValidationError(`kind must be one of ${KINDS.join(", ")}`);
  }

  const quantity = num(r.quantity, "quantity");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError(
      `quantity must be a positive whole number of contracts (got ${quantity})`,
    );
  }

  const strike = num(r.strike, "strike");
  if (strike <= 0) {
    throw new ValidationError(`strike must be greater than zero (got ${strike})`);
  }

  const price = num(r.price ?? 0, "price");
  if (price < 0) {
    throw new ValidationError(
      `price must not be negative — use side to express direction (got ${price})`,
    );
  }

  const fees = r.fees === undefined || r.fees === null ? 0 : num(r.fees, "fees");
  if (fees < 0) {
    throw new ValidationError(`fees must not be negative (got ${fees})`);
  }

  const multiplier =
    r.multiplier === undefined || r.multiplier === null
      ? 100
      : num(r.multiplier, "multiplier");
  if (!Number.isInteger(multiplier) || multiplier <= 0) {
    throw new ValidationError(
      `multiplier must be a positive whole number (got ${multiplier})`,
    );
  }

  const source = optionalStr(r.source) ?? "manual";
  if (!["manual", "screenshot", "csv"].includes(source)) {
    throw new ValidationError(`source must be manual, screenshot or csv`);
  }

  return {
    id: optionalStr(r.id) ?? undefined,
    tradedAt: new Date(tradedAtMs).toISOString(),
    tradeDate: r.tradeDate ? isoDate(r.tradeDate, "tradeDate") : undefined,
    underlying: str(r.underlying, "underlying").toUpperCase(),
    expiry: isoDate(r.expiry, "expiry"),
    strike,
    right,
    side,
    quantity,
    price,
    fees,
    multiplier,
    kind,
    groupId: optionalStr(r.groupId),
    strategy: optionalStr(r.strategy),
    note: optionalStr(r.note),
    source: source as ExecutionInput["source"],
  };
}

export function parseExecutionInputs(raw: unknown): ExecutionInput[] {
  if (!Array.isArray(raw)) {
    throw new ValidationError("Expected an array of executions");
  }
  if (raw.length === 0) {
    throw new ValidationError("Expected at least one execution");
  }
  if (raw.length > 200) {
    throw new ValidationError("Too many executions in one request (max 200)");
  }
  return raw.map((item, i) => {
    try {
      return parseExecutionInput(item);
    } catch (err) {
      // Point at the offending leg — otherwise a 12-leg paste is a guessing game.
      throw new ValidationError(
        `Leg ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });
}
