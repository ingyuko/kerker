"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Pencil, Trash2 } from "lucide-react";

import {
  type DraftLeg,
  DraftError,
  draftFromExecution,
  toExecutionInputs,
} from "@/components/options/draft-legs";
import { LegEditor } from "@/components/options/leg-editor";
import { useOptionsData } from "@/components/options/options-data";
import { contractLabel } from "@/lib/options/contract";
import { friendlyDate, marketTime, money, premium } from "@/lib/options/format";
import type { Execution } from "@/lib/options/types";
import { cn } from "@/lib/utils";

export default function TradesPage() {
  const { executions } = useOptionsData();

  const byDate = useMemo(() => {
    const groups = new Map<string, Execution[]>();
    for (const execution of executions) {
      const list = groups.get(execution.tradeDate);
      if (list) list.push(execution);
      else groups.set(execution.tradeDate, [execution]);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [executions]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(executions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `options-executions-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="pb-24">
      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-6">
        <div>
          <h1 className="font-serif text-2xl text-ink">交易紀錄</h1>
          <p className="mt-0.5 text-xs text-ink/50">
            共 {executions.length} 筆成交
          </p>
        </div>
        {executions.length > 0 ? (
          <button
            type="button"
            onClick={exportJson}
            className="flex items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink/70"
          >
            <Download className="size-3.5" />
            備份
          </button>
        ) : null}
      </header>

      {byDate.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink/50">
          還沒有任何成交紀錄。
        </p>
      ) : (
        byDate.map(([date, group]) => (
          <section key={date} className="mt-2">
            <h2 className="px-4 py-2 text-xs uppercase tracking-widest text-ink/45">
              {friendlyDate(date)}
            </h2>
            <ul className="divide-y divide-line border-y border-line">
              {group.map((execution) => (
                <ExecutionRow key={execution.id} execution={execution} />
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

function ExecutionRow({ execution }: { execution: Execution }) {
  const { replaceExecution, removeExecution } = useOptionsData();
  const [editing, setEditing] = useState<DraftLeg | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBuy = execution.side === "BUY";

  async function saveEdit() {
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    try {
      const [input] = toExecutionInputs([editing], {
        source: execution.source === "csv" ? "manual" : execution.source,
      });
      await replaceExecution(execution.id, {
        ...input,
        // Preserve the strategy grouping the row was saved with.
        groupId: execution.groupId,
        strategy: execution.strategy,
        note: execution.note,
      });
      setEditing(null);
    } catch (err) {
      setError(
        err instanceof DraftError || err instanceof Error
          ? err.message
          : String(err),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await removeExecution(execution.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <li className="bg-paper">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">
            <span
              className={cn(
                "mr-1.5 rounded px-1.5 py-0.5 text-[0.65rem] font-medium",
                isBuy ? "bg-ink/10 text-ink" : "bg-ink text-sand",
              )}
            >
              {isBuy ? "買" : "賣"}
            </span>
            {contractLabel(execution)}
            <span className="ml-1.5 text-ink/50">×{execution.quantity}</span>
          </p>
          <p className="mt-0.5 text-xs text-ink/50">
            {premium(execution.price)}
            {execution.fees > 0 ? `・費用 ${money(execution.fees)}` : ""}
            {execution.kind !== "TRADE" ? `・${KIND_LABEL[execution.kind]}` : ""}
            ・{marketTime(execution.tradedAt)} 美東
            {execution.source === "screenshot" ? "・截圖" : ""}
          </p>
          {execution.strategy || execution.note ? (
            <p className="mt-0.5 truncate text-[0.7rem] text-ink/40">
              {[execution.strategy, execution.note].filter(Boolean).join("・")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() =>
              setEditing((current) =>
                current ? null : draftFromExecution(execution),
              )
            }
            aria-label="編輯"
            className="rounded p-1.5 text-ink/40 hover:text-ink"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="刪除"
            className="rounded p-1.5 text-ink/40 hover:text-loss"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {confirmDelete ? (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-loss/5 px-4 py-2.5">
          <p className="text-xs text-loss">刪除這筆成交？損益會重新計算。</p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs text-ink"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="rounded-md bg-loss px-2.5 py-1 text-xs text-sand disabled:opacity-50"
            >
              {busy ? "刪除中…" : "刪除"}
            </button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="border-t border-line bg-sand/50 p-3">
          <LegEditor
            leg={editing}
            index={0}
            total={1}
            onChange={(patch) =>
              setEditing((current) => (current ? { ...current, ...patch } : current))
            }
          />
          {error ? (
            <p role="alert" className="mt-2 text-xs text-loss">
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setError(null);
              }}
              className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm text-sand disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              儲存
            </button>
          </div>
        </div>
      ) : null}

      {error && !editing ? (
        <p role="alert" className="px-4 pb-2 text-xs text-loss">
          {error}
        </p>
      ) : null}
    </li>
  );
}

const KIND_LABEL: Record<string, string> = {
  EXPIRE: "到期",
  ASSIGN: "被指派",
  EXERCISE: "行權",
  TRADE: "成交",
};
