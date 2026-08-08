/**
 * Domain model for the options P&L tracker.
 *
 * An "execution" is a single fill of a single option contract. Multi-leg
 * strategies (verticals, iron condors) are several executions sharing a
 * `groupId` — P&L is always computed per contract, grouping is for display.
 */

export type OptionRight = "C" | "P";
export type Side = "BUY" | "SELL";

/**
 * How the execution came about. `TRADE` is an ordinary fill; the others are
 * position-closing events that carry no premium (or a synthetic one).
 */
export type ExecutionKind = "TRADE" | "EXPIRE" | "ASSIGN" | "EXERCISE";

export type ExecutionSource = "manual" | "screenshot" | "csv";

export interface Execution {
  id: string;
  /** ISO timestamp of the fill. */
  tradedAt: string;
  /** Market date (America/New_York) as YYYY-MM-DD — the daily P&L bucket. */
  tradeDate: string;
  underlying: string;
  /** Expiry as YYYY-MM-DD. */
  expiry: string;
  strike: number;
  right: OptionRight;
  side: Side;
  /** Contracts filled. Always positive; direction lives in `side`. */
  quantity: number;
  /** Premium per share (what thinkorswim shows), not per contract. */
  price: number;
  /** Total commission + fees for this fill, in dollars. */
  fees: number;
  /** Shares per contract. 100 for standard US equity options. */
  multiplier: number;
  kind: ExecutionKind;
  /** Links legs of one strategy together. Null for single-leg trades. */
  groupId: string | null;
  strategy: string | null;
  note: string | null;
  source: ExecutionSource;
  createdAt: string;
}

/** Everything needed to create an execution; the server assigns id/createdAt. */
export type ExecutionInput = Omit<Execution, "id" | "createdAt" | "tradeDate"> &
  Partial<Pick<Execution, "id" | "tradeDate">>;

/** A manually entered current premium for an open contract. */
export interface Mark {
  contractKey: string;
  price: number;
  updatedAt: string;
}

/** One open/close pair produced by FIFO matching. */
export interface RealizedLot {
  contractKey: string;
  underlying: string;
  expiry: string;
  strike: number;
  right: OptionRight;
  /** LONG if the position was opened with a BUY, SHORT if with a SELL. */
  direction: "LONG" | "SHORT";
  quantity: number;
  openPrice: number;
  closePrice: number;
  openDate: string;
  /** Market date of the closing fill — the day this P&L is booked to. */
  closeDate: string;
  openExecutionId: string;
  closeExecutionId: string;
  /** Premium difference before costs. */
  grossPnl: number;
  /** Commissions from both legs, prorated to the matched quantity. */
  fees: number;
  /** grossPnl - fees. */
  netPnl: number;
  closeKind: ExecutionKind;
}

/** A contract still held after all executions are matched. */
export interface OpenPosition {
  contractKey: string;
  underlying: string;
  expiry: string;
  strike: number;
  right: OptionRight;
  direction: "LONG" | "SHORT";
  quantity: number;
  /** Quantity-weighted average premium paid (LONG) or received (SHORT). */
  avgPrice: number;
  multiplier: number;
  /** Unamortised commissions on the still-open contracts. */
  openFees: number;
  /** Earliest open date among the remaining lots. */
  openedAt: string;
  groupId: string | null;
  strategy: string | null;
  /** Cash received (SHORT) or paid (LONG) to open, net of fees. */
  costBasis: number;
}

/** An open position valued against a manually entered mark. */
export interface MarkedPosition extends OpenPosition {
  markPrice: number | null;
  /** Null when no mark has been entered. */
  unrealizedPnl: number | null;
}

/** Realized P&L rolled up to one market date. */
export interface DailyPnl {
  date: string;
  /** Sum of netPnl for lots closed on this date. */
  realized: number;
  grossRealized: number;
  /** Fees embedded in the closed lots. */
  closedFees: number;
  /** Every fee paid on this date, including on positions still open. */
  feesPaid: number;
  /** Number of closing matches booked. */
  closes: number;
  wins: number;
  losses: number;
  /** Executions entered on this date, closing or not. */
  executions: number;
  lots: RealizedLot[];
}

export interface PnlSummary {
  daily: DailyPnl[];
  realizedLots: RealizedLot[];
  openPositions: OpenPosition[];
  totalRealized: number;
  totalFees: number;
  wins: number;
  losses: number;
  /** Wins / (wins + losses); null when nothing has closed yet. */
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  /** |avgWin / avgLoss|; null when either side is empty. */
  profitFactor: number | null;
  bestDay: DailyPnl | null;
  worstDay: DailyPnl | null;
}
