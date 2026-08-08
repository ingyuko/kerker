import { describe, expect, it } from "vitest";

import {
  ValidationError,
  parseExecutionInput,
  parseExecutionInputs,
} from "@/lib/options/validate";

const VALID = {
  tradedAt: "2026-03-02T15:30:00-05:00",
  underlying: "spy",
  expiry: "2026-04-17",
  strike: 500,
  right: "p",
  side: "sell",
  quantity: 1,
  price: 1.8,
  fees: 1.3,
};

describe("parseExecutionInput", () => {
  it("normalises case and fills in defaults", () => {
    const input = parseExecutionInput(VALID);

    expect(input.underlying).toBe("SPY");
    expect(input.right).toBe("P");
    expect(input.side).toBe("SELL");
    expect(input.kind).toBe("TRADE");
    expect(input.multiplier).toBe(100);
    expect(input.source).toBe("manual");
    expect(input.tradedAt).toBe("2026-03-02T20:30:00.000Z");
  });

  it("accepts numbers typed as strings", () => {
    const input = parseExecutionInput({
      ...VALID,
      strike: "500",
      quantity: "2",
      price: "1.80",
      fees: " 1.30 ",
    });

    expect(input.strike).toBe(500);
    expect(input.quantity).toBe(2);
    expect(input.price).toBe(1.8);
    expect(input.fees).toBe(1.3);
  });

  it("treats blank optional text as absent rather than empty", () => {
    const input = parseExecutionInput({ ...VALID, note: "   ", strategy: "" });

    expect(input.note).toBeNull();
    expect(input.strategy).toBeNull();
  });

  it("allows a zero premium so expiries can be recorded", () => {
    expect(parseExecutionInput({ ...VALID, price: 0, kind: "expire" }).price).toBe(0);
  });

  it.each([
    ["a fractional contract count", { quantity: 1.5 }, /whole number of contracts/],
    ["a zero contract count", { quantity: 0 }, /positive whole number/],
    ["a negative price", { price: -1 }, /must not be negative/],
    ["negative fees", { fees: -0.5 }, /must not be negative/],
    ["a zero strike", { strike: 0 }, /greater than zero/],
    ["an unknown right", { right: "X" }, /must be C or P/],
    ["an unknown side", { side: "SHORT" }, /must be BUY or SELL/],
    ["an unknown kind", { kind: "ROLL" }, /kind must be one of/],
    ["a US-format expiry", { expiry: "04/17/2026" }, /YYYY-MM-DD/],
    ["an impossible expiry", { expiry: "2026-13-45" }, /not a real date/],
    ["an unparseable timestamp", { tradedAt: "yesterday" }, /valid timestamp/],
    ["a missing underlying", { underlying: "  " }, /underlying is required/],
    ["a non-numeric strike", { strike: "abc" }, /must be a number/],
  ])("rejects %s", (_label, patch, expected) => {
    expect(() => parseExecutionInput({ ...VALID, ...patch })).toThrow(expected);
  });

  it("rejects a payload that is not an object", () => {
    expect(() => parseExecutionInput("nope")).toThrow(ValidationError);
  });
});

describe("parseExecutionInputs", () => {
  it("accepts a multi-leg batch", () => {
    expect(parseExecutionInputs([VALID, { ...VALID, strike: 495 }])).toHaveLength(2);
  });

  it("names the offending leg so a long paste is debuggable", () => {
    expect(() =>
      parseExecutionInputs([VALID, { ...VALID, quantity: 0 }]),
    ).toThrow(/^Leg 2: /);
  });

  it("rejects an empty batch", () => {
    expect(() => parseExecutionInputs([])).toThrow(/at least one execution/);
  });

  it("rejects a non-array", () => {
    expect(() => parseExecutionInputs({ ...VALID })).toThrow(/array of executions/);
  });

  it("caps batch size", () => {
    expect(() => parseExecutionInputs(Array(201).fill(VALID))).toThrow(/max 200/);
  });
});
