import { contractKey } from "./contract";
import type {
  DailyPnl,
  Execution,
  MarkedPosition,
  OpenPosition,
  PnlSummary,
  RealizedLot,
} from "./types";

/**
 * One tranche of an open position, waiting to be matched against a closing
 * fill. `feePerContract` carries the opening commission so it can be prorated
 * when only part of the lot is closed.
 */
interface OpenLot {
  quantity: number;
  price: number;
  feePerContract: number;
  tradedAt: string;
  tradeDate: string;
  executionId: string;
  multiplier: number;
  groupId: string | null;
  strategy: string | null;
}

/** Rounds to cents so repeated float arithmetic doesn't leak 1e-13 dust. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function byTime(a: Execution, b: Execution): number {
  const t = a.tradedAt.localeCompare(b.tradedAt);
  if (t !== 0) return t;
  // Deterministic tie-break so same-timestamp fills always match in a fixed
  // order — otherwise two runs over the same data could differ.
  return a.id.localeCompare(b.id);
}

/**
 * FIFO-matches executions per contract into realized lots plus whatever is
 * still open.
 *
 * Open vs close is derived from the running position rather than trusted from
 * the input: a BUY while short is a close, a BUY while flat or long is an
 * open. That way a mis-tagged entry can't corrupt the P&L.
 */
export function matchExecutions(executions: Execution[]): {
  realizedLots: RealizedLot[];
  openPositions: OpenPosition[];
} {
  const byContract = new Map<string, Execution[]>();
  for (const e of executions) {
    const key = contractKey(e);
    const list = byContract.get(key);
    if (list) list.push(e);
    else byContract.set(key, [e]);
  }

  const realizedLots: RealizedLot[] = [];
  const openPositions: OpenPosition[] = [];

  for (const [key, group] of byContract) {
    const sorted = [...group].sort(byTime);
    // Lots always share a direction: a queue is either all long or all short,
    // because an opposite fill closes before it can open.
    let direction: "LONG" | "SHORT" | null = null;
    const queue: OpenLot[] = [];

    for (const e of sorted) {
      if (e.quantity <= 0) continue;
      const feePerContract = e.fees / e.quantity;
      const isBuy = e.side === "BUY";
      const closes =
        direction !== null &&
        ((direction === "LONG" && !isBuy) || (direction === "SHORT" && isBuy));

      let remaining = e.quantity;

      if (closes) {
        while (remaining > 0 && queue.length > 0) {
          const lot = queue[0];
          const matched = Math.min(remaining, lot.quantity);
          const multiplier = lot.multiplier;

          const gross =
            direction === "LONG"
              ? (e.price - lot.price) * matched * multiplier
              : (lot.price - e.price) * matched * multiplier;
          const fees = matched * (lot.feePerContract + feePerContract);

          realizedLots.push({
            contractKey: key,
            underlying: e.underlying,
            expiry: e.expiry,
            strike: e.strike,
            right: e.right,
            direction: direction as "LONG" | "SHORT",
            quantity: matched,
            openPrice: lot.price,
            closePrice: e.price,
            openDate: lot.tradeDate,
            closeDate: e.tradeDate,
            openExecutionId: lot.executionId,
            closeExecutionId: e.id,
            grossPnl: round2(gross),
            fees: round2(fees),
            netPnl: round2(gross - fees),
            closeKind: e.kind,
          });

          lot.quantity -= matched;
          remaining -= matched;
          if (lot.quantity <= 0) queue.shift();
        }
        if (queue.length === 0) direction = null;
      }

      // Anything left over opens (or reverses into) a position.
      if (remaining > 0) {
        direction = isBuy ? "LONG" : "SHORT";
        queue.push({
          quantity: remaining,
          price: e.price,
          feePerContract,
          tradedAt: e.tradedAt,
          tradeDate: e.tradeDate,
          executionId: e.id,
          multiplier: e.multiplier,
          groupId: e.groupId,
          strategy: e.strategy,
        });
      }
    }

    if (queue.length > 0 && direction) {
      const quantity = queue.reduce((s, l) => s + l.quantity, 0);
      const notional = queue.reduce((s, l) => s + l.price * l.quantity, 0);
      const openFees = queue.reduce(
        (s, l) => s + l.feePerContract * l.quantity,
        0,
      );
      const multiplier = queue[0].multiplier;
      const first = sorted[0];
      const premium = notional * multiplier;

      openPositions.push({
        contractKey: key,
        underlying: first.underlying,
        expiry: first.expiry,
        strike: first.strike,
        right: first.right,
        direction,
        quantity,
        avgPrice: quantity === 0 ? 0 : notional / quantity,
        multiplier,
        openFees: round2(openFees),
        openedAt: queue[0].tradedAt,
        groupId: queue[0].groupId,
        strategy: queue[0].strategy,
        costBasis: round2(
          (direction === "SHORT" ? premium : -premium) - openFees,
        ),
      });
    }
  }

  realizedLots.sort(
    (a, b) =>
      a.closeDate.localeCompare(b.closeDate) ||
      a.contractKey.localeCompare(b.contractKey),
  );
  openPositions.sort(
    (a, b) =>
      a.expiry.localeCompare(b.expiry) ||
      a.underlying.localeCompare(b.underlying) ||
      a.strike - b.strike,
  );

  return { realizedLots, openPositions };
}

/**
 * Rolls realized lots up by close date, and folds in every fee paid that day
 * (including on positions still open) so the fee line is complete.
 */
export function dailyPnl(
  realizedLots: RealizedLot[],
  executions: Execution[],
): DailyPnl[] {
  const days = new Map<string, DailyPnl>();

  const ensure = (date: string): DailyPnl => {
    let day = days.get(date);
    if (!day) {
      day = {
        date,
        realized: 0,
        grossRealized: 0,
        closedFees: 0,
        feesPaid: 0,
        closes: 0,
        wins: 0,
        losses: 0,
        executions: 0,
        lots: [],
      };
      days.set(date, day);
    }
    return day;
  };

  for (const lot of realizedLots) {
    const day = ensure(lot.closeDate);
    day.realized += lot.netPnl;
    day.grossRealized += lot.grossPnl;
    day.closedFees += lot.fees;
    day.closes += 1;
    if (lot.netPnl > 0) day.wins += 1;
    else if (lot.netPnl < 0) day.losses += 1;
    day.lots.push(lot);
  }

  for (const e of executions) {
    const day = ensure(e.tradeDate);
    day.feesPaid += e.fees;
    day.executions += 1;
  }

  for (const day of days.values()) {
    day.realized = round2(day.realized);
    day.grossRealized = round2(day.grossRealized);
    day.closedFees = round2(day.closedFees);
    day.feesPaid = round2(day.feesPaid);
  }

  // Newest first — the app is read top-down on a phone.
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Values open positions against manually entered marks. */
export function markPositions(
  positions: OpenPosition[],
  marks: Record<string, number>,
): MarkedPosition[] {
  return positions.map((p) => {
    const markPrice = marks[p.contractKey];
    if (markPrice === undefined || markPrice === null) {
      return { ...p, markPrice: null, unrealizedPnl: null };
    }
    const gross =
      p.direction === "LONG"
        ? (markPrice - p.avgPrice) * p.quantity * p.multiplier
        : (p.avgPrice - markPrice) * p.quantity * p.multiplier;
    return {
      ...p,
      markPrice,
      // Net of the commissions already paid to open, so realized + unrealized
      // adds up to a true equity view.
      unrealizedPnl: round2(gross - p.openFees),
    };
  });
}

/** Full report: matching, daily buckets, and headline statistics. */
export function summarize(executions: Execution[]): PnlSummary {
  const { realizedLots, openPositions } = matchExecutions(executions);
  const daily = dailyPnl(realizedLots, executions);

  const winning = realizedLots.filter((l) => l.netPnl > 0);
  const losing = realizedLots.filter((l) => l.netPnl < 0);
  const sum = (ls: RealizedLot[]) => ls.reduce((s, l) => s + l.netPnl, 0);

  const totalWin = sum(winning);
  const totalLoss = sum(losing);
  const decided = winning.length + losing.length;

  // Days with no closes carry realized 0 and would distort best/worst, so rank
  // only days that actually booked something.
  const ranked = daily.filter((d) => d.closes > 0);
  const sortedByPnl = [...ranked].sort((a, b) => a.realized - b.realized);

  return {
    daily,
    realizedLots,
    openPositions,
    totalRealized: round2(sum(realizedLots)),
    totalFees: round2(executions.reduce((s, e) => s + e.fees, 0)),
    wins: winning.length,
    losses: losing.length,
    winRate: decided === 0 ? null : winning.length / decided,
    avgWin: winning.length === 0 ? null : round2(totalWin / winning.length),
    avgLoss: losing.length === 0 ? null : round2(totalLoss / losing.length),
    profitFactor:
      totalLoss === 0 || winning.length === 0
        ? null
        : round2(Math.abs(totalWin / totalLoss)),
    worstDay: sortedByPnl[0] ?? null,
    bestDay: sortedByPnl[sortedByPnl.length - 1] ?? null,
  };
}

/** Running cumulative realized P&L, oldest first — the equity curve. */
export function equityCurve(
  daily: DailyPnl[],
): { date: string; cumulative: number }[] {
  const chronological = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  return chronological.map((d) => {
    running = round2(running + d.realized);
    return { date: d.date, cumulative: running };
  });
}
