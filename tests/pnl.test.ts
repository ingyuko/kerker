import { describe, expect, it } from "vitest";

import { contractLabel, marketDate } from "@/lib/options/contract";
import { equityCurve, markPositions, summarize } from "@/lib/options/pnl";
import type { Execution, ExecutionKind, Side } from "@/lib/options/types";

let seq = 0;

function exec(partial: Partial<Execution> & { side: Side }): Execution {
  seq += 1;
  // Fills default to distinct, increasing instants inside one regular session.
  const minute = String(seq % 60).padStart(2, "0");
  const hour = String(14 + Math.floor(seq / 60)).padStart(2, "0");
  const tradedAt = partial.tradedAt ?? `2026-03-02T${hour}:${minute}:00.000Z`;
  return {
    id: partial.id ?? `e${seq}`,
    tradedAt,
    tradeDate: partial.tradeDate ?? marketDate(tradedAt),
    underlying: partial.underlying ?? "SPY",
    expiry: partial.expiry ?? "2026-04-17",
    strike: partial.strike ?? 500,
    right: partial.right ?? "P",
    side: partial.side,
    quantity: partial.quantity ?? 1,
    price: partial.price ?? 1,
    fees: partial.fees ?? 0,
    multiplier: partial.multiplier ?? 100,
    kind: (partial.kind ?? "TRADE") as ExecutionKind,
    groupId: partial.groupId ?? null,
    strategy: partial.strategy ?? null,
    note: partial.note ?? null,
    source: partial.source ?? "manual",
    createdAt: partial.createdAt ?? tradedAt,
  };
}

describe("marketDate", () => {
  it("buckets by New York date, not UTC", () => {
    // 21:30 New York on the 9th is 01:30 UTC on the 10th.
    expect(marketDate("2026-03-10T01:30:00.000Z")).toBe("2026-03-09");
  });

  it("keeps a regular session instant on its own day", () => {
    expect(marketDate("2026-03-09T18:00:00.000Z")).toBe("2026-03-09");
  });

  it("rejects an unparseable input", () => {
    expect(() => marketDate("not-a-date")).toThrow(/invalid date/);
  });
});

describe("contractLabel", () => {
  it("renders the thinkorswim-style short form", () => {
    expect(
      contractLabel({
        underlying: "spy",
        expiry: "2026-04-17",
        strike: 500,
        right: "P",
      }),
    ).toBe("SPY 260417 500P");
  });
});

describe("summarize — realized P&L", () => {
  it("books a profitable long round trip on the closing date", () => {
    const executions = [
      exec({ side: "BUY", price: 2, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({ side: "SELL", price: 3.5, tradedAt: "2026-03-04T15:00:00.000Z" }),
    ];

    const s = summarize(executions);

    expect(s.realizedLots).toHaveLength(1);
    expect(s.realizedLots[0].direction).toBe("LONG");
    expect(s.realizedLots[0].netPnl).toBe(150);
    expect(s.totalRealized).toBe(150);
    expect(s.openPositions).toHaveLength(0);
    // Booked to the close date, not the open date.
    expect(s.daily.find((d) => d.date === "2026-03-04")?.realized).toBe(150);
    expect(s.daily.find((d) => d.date === "2026-03-02")?.realized).toBe(0);
  });

  it("books a credit spread sold then bought back as a gain", () => {
    const executions = [
      exec({ side: "SELL", price: 1.8, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({ side: "BUY", price: 0.4, tradedAt: "2026-03-06T15:00:00.000Z" }),
    ];

    const s = summarize(executions);

    expect(s.realizedLots[0].direction).toBe("SHORT");
    expect(s.realizedLots[0].netPnl).toBe(140);
  });

  it("nets commissions from both legs into the closed lot", () => {
    const executions = [
      exec({
        side: "BUY",
        price: 2,
        fees: 1.3,
        tradedAt: "2026-03-02T15:00:00.000Z",
      }),
      exec({
        side: "SELL",
        price: 3,
        fees: 1.3,
        tradedAt: "2026-03-04T15:00:00.000Z",
      }),
    ];

    const s = summarize(executions);

    expect(s.realizedLots[0].grossPnl).toBe(100);
    expect(s.realizedLots[0].fees).toBe(2.6);
    expect(s.realizedLots[0].netPnl).toBe(97.4);
    expect(s.totalFees).toBe(2.6);
  });

  it("prorates opening fees when only part of a lot is closed", () => {
    const executions = [
      exec({
        side: "BUY",
        quantity: 4,
        price: 1,
        fees: 4,
        tradedAt: "2026-03-02T15:00:00.000Z",
      }),
      exec({
        side: "SELL",
        quantity: 1,
        price: 2,
        fees: 1,
        tradedAt: "2026-03-05T15:00:00.000Z",
      }),
    ];

    const s = summarize(executions);

    expect(s.realizedLots).toHaveLength(1);
    expect(s.realizedLots[0].quantity).toBe(1);
    // One of four contracts closed: $1 of the $4 opening fee, plus $1 to close.
    expect(s.realizedLots[0].fees).toBe(2);
    expect(s.realizedLots[0].netPnl).toBe(98);
    // The remaining three stay open with their share of the fee.
    expect(s.openPositions[0].quantity).toBe(3);
    expect(s.openPositions[0].openFees).toBe(3);
  });

  it("matches oldest lot first when prices differ", () => {
    const executions = [
      exec({ side: "BUY", price: 1, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({ side: "BUY", price: 5, tradedAt: "2026-03-03T15:00:00.000Z" }),
      exec({ side: "SELL", price: 4, tradedAt: "2026-03-04T15:00:00.000Z" }),
    ];

    const s = summarize(executions);

    // FIFO closes the $1 lot, so this is a gain — LIFO would show a loss.
    expect(s.realizedLots).toHaveLength(1);
    expect(s.realizedLots[0].openPrice).toBe(1);
    expect(s.realizedLots[0].netPnl).toBe(300);
    expect(s.openPositions[0].avgPrice).toBe(5);
  });

  it("splits one closing fill across several opening lots", () => {
    const executions = [
      exec({
        side: "BUY",
        quantity: 2,
        price: 1,
        tradedAt: "2026-03-02T15:00:00.000Z",
      }),
      exec({
        side: "BUY",
        quantity: 3,
        price: 2,
        tradedAt: "2026-03-03T15:00:00.000Z",
      }),
      exec({
        side: "SELL",
        quantity: 5,
        price: 3,
        tradedAt: "2026-03-04T15:00:00.000Z",
      }),
    ];

    const s = summarize(executions);

    expect(s.realizedLots).toHaveLength(2);
    expect(s.realizedLots.map((l) => l.netPnl)).toEqual([400, 300]);
    expect(s.openPositions).toHaveLength(0);
  });

  it("treats an expiry at zero as a full loss for the buyer", () => {
    const executions = [
      exec({ side: "BUY", price: 1.2, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({
        side: "SELL",
        price: 0,
        kind: "EXPIRE",
        tradedAt: "2026-04-17T20:00:00.000Z",
      }),
    ];

    const s = summarize(executions);

    expect(s.realizedLots[0].netPnl).toBe(-120);
    expect(s.realizedLots[0].closeKind).toBe("EXPIRE");
  });

  it("treats an expiry at zero as the full credit for the seller", () => {
    const executions = [
      exec({ side: "SELL", price: 1.2, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({
        side: "BUY",
        price: 0,
        kind: "EXPIRE",
        tradedAt: "2026-04-17T20:00:00.000Z",
      }),
    ];

    expect(summarize(executions).realizedLots[0].netPnl).toBe(120);
  });

  it("derives close-vs-open from the running position, not the input order", () => {
    // Sold first, then bought: the buy must close the short, not open a long.
    const executions = [
      exec({ side: "SELL", price: 2, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({ side: "BUY", price: 1, tradedAt: "2026-03-03T15:00:00.000Z" }),
    ];

    const s = summarize(executions);

    expect(s.openPositions).toHaveLength(0);
    expect(s.realizedLots[0].netPnl).toBe(100);
  });

  it("reverses through flat when a fill exceeds the open quantity", () => {
    const executions = [
      exec({
        side: "BUY",
        quantity: 1,
        price: 2,
        tradedAt: "2026-03-02T15:00:00.000Z",
      }),
      exec({
        side: "SELL",
        quantity: 3,
        price: 3,
        tradedAt: "2026-03-03T15:00:00.000Z",
      }),
    ];

    const s = summarize(executions);

    expect(s.realizedLots).toHaveLength(1);
    expect(s.realizedLots[0].netPnl).toBe(100);
    // The surplus 2 contracts open a short.
    expect(s.openPositions[0].direction).toBe("SHORT");
    expect(s.openPositions[0].quantity).toBe(2);
  });

  it("keeps different strikes and rights independent", () => {
    const executions = [
      exec({
        side: "SELL",
        strike: 500,
        right: "P",
        price: 2,
        tradedAt: "2026-03-02T15:00:00.000Z",
      }),
      exec({
        side: "BUY",
        strike: 495,
        right: "P",
        price: 1,
        tradedAt: "2026-03-02T15:00:01.000Z",
      }),
      exec({
        side: "BUY",
        strike: 500,
        right: "C",
        price: 3,
        tradedAt: "2026-03-02T15:00:02.000Z",
      }),
    ];

    const s = summarize(executions);

    // Nothing matches — three distinct contracts, all still open.
    expect(s.realizedLots).toHaveLength(0);
    expect(s.openPositions).toHaveLength(3);
  });

  it("orders same-timestamp fills deterministically", () => {
    const at = "2026-03-02T15:00:00.000Z";
    const forward = [
      exec({ id: "a", side: "BUY", price: 1, tradedAt: at }),
      exec({ id: "b", side: "BUY", price: 9, tradedAt: at }),
      exec({ id: "c", side: "SELL", price: 5, tradedAt: at }),
    ];
    const reversed = [...forward].reverse();

    expect(summarize(forward).realizedLots).toEqual(
      summarize(reversed).realizedLots,
    );
  });
});

describe("summarize — statistics", () => {
  const executions = [
    // +$100
    exec({ side: "BUY", price: 1, tradedAt: "2026-03-02T15:00:00.000Z" }),
    exec({ side: "SELL", price: 2, tradedAt: "2026-03-02T16:00:00.000Z" }),
    // -$50
    exec({
      side: "BUY",
      strike: 490,
      price: 1,
      tradedAt: "2026-03-03T15:00:00.000Z",
    }),
    exec({
      side: "SELL",
      strike: 490,
      price: 0.5,
      tradedAt: "2026-03-03T16:00:00.000Z",
    }),
    // +$200
    exec({
      side: "BUY",
      strike: 480,
      price: 1,
      tradedAt: "2026-03-04T15:00:00.000Z",
    }),
    exec({
      side: "SELL",
      strike: 480,
      price: 3,
      tradedAt: "2026-03-04T16:00:00.000Z",
    }),
  ];

  it("computes win rate, averages and profit factor", () => {
    const s = summarize(executions);

    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.avgWin).toBe(150);
    expect(s.avgLoss).toBe(-50);
    expect(s.profitFactor).toBe(6);
    expect(s.totalRealized).toBe(250);
  });

  it("identifies best and worst days", () => {
    const s = summarize(executions);

    expect(s.bestDay?.date).toBe("2026-03-04");
    expect(s.worstDay?.date).toBe("2026-03-03");
  });

  it("ignores days with no closes when ranking", () => {
    const s = summarize([
      exec({ side: "BUY", price: 1, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({ side: "SELL", price: 0.5, tradedAt: "2026-03-03T15:00:00.000Z" }),
    ]);

    // The open-only day sits at 0, which would otherwise beat the -$50 close.
    expect(s.bestDay?.date).toBe("2026-03-03");
    expect(s.worstDay?.date).toBe("2026-03-03");
  });

  it("returns null statistics with nothing closed", () => {
    const s = summarize([exec({ side: "BUY", price: 1 })]);

    expect(s.winRate).toBeNull();
    expect(s.avgWin).toBeNull();
    expect(s.avgLoss).toBeNull();
    expect(s.profitFactor).toBeNull();
    expect(s.bestDay).toBeNull();
  });

  it("handles an empty book", () => {
    const s = summarize([]);

    expect(s.daily).toEqual([]);
    expect(s.totalRealized).toBe(0);
    expect(s.openPositions).toEqual([]);
  });
});

describe("dailyPnl fees", () => {
  it("counts fees on the day they were paid, even on open positions", () => {
    const s = summarize([
      exec({
        side: "BUY",
        price: 1,
        fees: 1.3,
        tradedAt: "2026-03-02T15:00:00.000Z",
      }),
    ]);

    const day = s.daily.find((d) => d.date === "2026-03-02");
    expect(day?.feesPaid).toBe(1.3);
    expect(day?.closedFees).toBe(0);
    expect(day?.executions).toBe(1);
  });
});

describe("markPositions", () => {
  it("values a short position against a lower mark as a gain", () => {
    const s = summarize([exec({ side: "SELL", price: 2, fees: 1 })]);
    const [marked] = markPositions(s.openPositions, {
      [s.openPositions[0].contractKey]: 0.5,
    });

    expect(marked.unrealizedPnl).toBe(149);
  });

  it("values a long position against a lower mark as a loss", () => {
    const s = summarize([exec({ side: "BUY", price: 2 })]);
    const [marked] = markPositions(s.openPositions, {
      [s.openPositions[0].contractKey]: 1.25,
    });

    expect(marked.unrealizedPnl).toBe(-75);
  });

  it("leaves unmarked positions null rather than assuming zero", () => {
    const s = summarize([exec({ side: "BUY", price: 2 })]);
    const [marked] = markPositions(s.openPositions, {});

    expect(marked.markPrice).toBeNull();
    expect(marked.unrealizedPnl).toBeNull();
  });
});

describe("equityCurve", () => {
  it("accumulates realized P&L oldest first", () => {
    const s = summarize([
      exec({ side: "BUY", price: 1, tradedAt: "2026-03-02T15:00:00.000Z" }),
      exec({ side: "SELL", price: 2, tradedAt: "2026-03-02T16:00:00.000Z" }),
      exec({
        side: "BUY",
        strike: 490,
        price: 1,
        tradedAt: "2026-03-03T15:00:00.000Z",
      }),
      exec({
        side: "SELL",
        strike: 490,
        price: 0.5,
        tradedAt: "2026-03-03T16:00:00.000Z",
      }),
    ]);

    expect(equityCurve(s.daily)).toEqual([
      { date: "2026-03-02", cumulative: 100 },
      { date: "2026-03-03", cumulative: 50 },
    ]);
  });
});
