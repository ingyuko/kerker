"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError, api } from "@/lib/options/client";
import { markPositions, summarize } from "@/lib/options/pnl";
import type {
  Execution,
  ExecutionInput,
  Mark,
  MarkedPosition,
  PnlSummary,
} from "@/lib/options/types";

type Status = "loading" | "locked" | "ready" | "error";

interface OptionsData {
  status: Status;
  error: string | null;
  /** True when running on the local JSON fallback instead of Postgres. */
  ephemeral: boolean;
  executions: Execution[];
  summary: PnlSummary;
  positions: MarkedPosition[];
  /** Total unrealised P&L across positions that have a mark. */
  unrealized: number;
  /** Open positions still waiting for a manual price. */
  unmarkedCount: number;
  refresh: () => Promise<void>;
  unlock: (passcode: string) => Promise<void>;
  signOut: () => Promise<void>;
  addExecutions: (inputs: ExecutionInput[]) => Promise<Execution[]>;
  replaceExecution: (id: string, input: ExecutionInput) => Promise<void>;
  removeExecution: (id: string) => Promise<void>;
  setMark: (contractKey: string, price: number) => Promise<void>;
  clearMark: (contractKey: string) => Promise<void>;
}

const Context = createContext<OptionsData | null>(null);

const EMPTY_SUMMARY: PnlSummary = {
  daily: [],
  realizedLots: [],
  openPositions: [],
  totalRealized: 0,
  totalFees: 0,
  wins: 0,
  losses: 0,
  winRate: null,
  avgWin: null,
  avgLoss: null,
  profitFactor: null,
  bestDay: null,
  worstDay: null,
};

interface Payload {
  executions: Execution[];
  marks: Mark[];
  ephemeral: boolean;
}

export function OptionsDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [ephemeral, setEphemeral] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Payload>("/api/options/executions");
      setExecutions(data.executions);
      setMarks(data.marks);
      setEphemeral(Boolean(data.ephemeral));
      setError(null);
      setStatus("ready");
    } catch (err) {
      // A 401 means the passcode gate, not a failure worth an error screen.
      if (err instanceof ApiError && err.status === 401) {
        setStatus("locked");
        setError(null);
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unlock = useCallback(
    async (passcode: string) => {
      await api.post("/api/options/session", { passcode });
      setStatus("loading");
      await load();
    },
    [load],
  );

  const signOut = useCallback(async () => {
    await api.del("/api/options/session");
    setExecutions([]);
    setMarks([]);
    setStatus("locked");
  }, []);

  const addExecutions = useCallback(
    async (inputs: ExecutionInput[]) => {
      const { executions: created } = await api.post<{
        executions: Execution[];
      }>("/api/options/executions", { executions: inputs });
      await load();
      return created;
    },
    [load],
  );

  const replaceExecution = useCallback(
    async (id: string, input: ExecutionInput) => {
      await api.put(`/api/options/executions/${id}`, input);
      await load();
    },
    [load],
  );

  const removeExecution = useCallback(
    async (id: string) => {
      await api.del(`/api/options/executions/${id}`);
      await load();
    },
    [load],
  );

  const setMark = useCallback(async (contractKey: string, price: number) => {
    const { mark } = await api.put<{ mark: Mark }>("/api/options/marks", {
      contractKey,
      price,
    });
    // Marks only affect the unrealised column, so update in place rather than
    // refetching the whole book on every keystroke-sized edit.
    setMarks((current) => [
      ...current.filter((m) => m.contractKey !== contractKey),
      mark,
    ]);
  }, []);

  const clearMark = useCallback(async (contractKey: string) => {
    await api.del(
      `/api/options/marks?contractKey=${encodeURIComponent(contractKey)}`,
    );
    setMarks((current) => current.filter((m) => m.contractKey !== contractKey));
  }, []);

  const summary = useMemo(
    () => (executions.length === 0 ? EMPTY_SUMMARY : summarize(executions)),
    [executions],
  );

  const positions = useMemo(() => {
    const lookup: Record<string, number> = {};
    for (const mark of marks) lookup[mark.contractKey] = mark.price;
    return markPositions(summary.openPositions, lookup);
  }, [summary.openPositions, marks]);

  const unrealized = useMemo(
    () =>
      positions.reduce((total, p) => total + (p.unrealizedPnl ?? 0), 0),
    [positions],
  );

  const unmarkedCount = useMemo(
    () => positions.filter((p) => p.markPrice === null).length,
    [positions],
  );

  const value: OptionsData = {
    status,
    error,
    ephemeral,
    executions,
    summary,
    positions,
    unrealized: Math.round(unrealized * 100) / 100,
    unmarkedCount,
    refresh: load,
    unlock,
    signOut,
    addExecutions,
    replaceExecution,
    removeExecution,
    setMark,
    clearMark,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOptionsData(): OptionsData {
  const value = useContext(Context);
  if (!value) {
    throw new Error("useOptionsData must be used inside <OptionsDataProvider>");
  }
  return value;
}
