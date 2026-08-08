"use client";

import { useEffect, useState } from "react";

import { useOptionsData } from "@/components/options/options-data";
import { contractLabel, daysToExpiry } from "@/lib/options/contract";
import {
  expiryLabel,
  money,
  pnlColor,
  premium,
  signedMoney,
} from "@/lib/options/format";
import type { MarkedPosition } from "@/lib/options/types";
import { cn } from "@/lib/utils";

export default function PositionsPage() {
  const { positions, unrealized, unmarkedCount } = useOptionsData();

  return (
    <main className="pb-24">
      <header className="px-4 pb-3 pt-6">
        <h1 className="font-serif text-2xl text-ink">未平倉部位</h1>
        <p className="mt-0.5 text-xs text-ink/50">
          填入目前權利金，就能看到未實現損益
        </p>
      </header>

      {positions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink/50">
          目前沒有未平倉的部位。
        </p>
      ) : (
        <>
          <section className="px-4">
            <div className="rounded-lg border border-line bg-paper p-4">
              <p className="text-xs uppercase tracking-widest text-ink/45">
                未實現損益合計
              </p>
              <p
                className={cn(
                  "mt-1 font-serif text-3xl tabular-nums",
                  pnlColor(unrealized),
                )}
              >
                {signedMoney(unrealized)}
              </p>
              <p className="mt-1 text-xs text-ink/50">
                {positions.length} 個合約
                {unmarkedCount > 0
                  ? `・其中 ${unmarkedCount} 個尚未報價，未計入`
                  : ""}
              </p>
            </div>
          </section>

          <ul className="mt-4 space-y-3 px-4">
            {positions.map((position) => (
              <PositionCard key={position.contractKey} position={position} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function PositionCard({ position }: { position: MarkedPosition }) {
  const { setMark, clearMark } = useOptionsData();
  const [draft, setDraft] = useState(
    position.markPrice === null ? "" : String(position.markPrice),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the field in step when the mark changes elsewhere (e.g. after a refresh).
  useEffect(() => {
    setDraft(position.markPrice === null ? "" : String(position.markPrice));
  }, [position.markPrice]);

  const dte = daysToExpiry(position.expiry);
  const expired = dte < 0;

  async function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (position.markPrice === null) return;
      setBusy(true);
      try {
        await clearMark(position.contractKey);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    const price = Number(trimmed);
    if (!Number.isFinite(price) || price < 0) {
      setError("請輸入不小於 0 的數字。");
      return;
    }
    if (price === position.markPrice) return;

    setBusy(true);
    try {
      await setMark(position.contractKey, price);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-line bg-paper p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">
            {contractLabel(position)}
          </p>
          <p className="mt-0.5 text-xs text-ink/50">
            {position.direction === "LONG" ? "買進" : "賣出"} ×
            {position.quantity}・均價 {premium(position.avgPrice)}
            <span className={cn("ml-1.5", expired && "text-loss")}>
              {expiryLabel(dte)}
            </span>
          </p>
          {position.strategy ? (
            <p className="mt-0.5 text-[0.7rem] text-ink/40">
              {position.strategy}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-serif text-lg tabular-nums",
              position.unrealizedPnl === null
                ? "text-ink/35"
                : pnlColor(position.unrealizedPnl),
            )}
          >
            {position.unrealizedPnl === null
              ? "—"
              : signedMoney(position.unrealizedPnl)}
          </p>
          <p className="text-[0.65rem] text-ink/45">
            {position.direction === "SHORT" ? "已收" : "已付"}{" "}
            {money(position.costBasis)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <label className="flex flex-1 items-center gap-2">
          <span className="text-[0.7rem] text-ink/50">目前權利金</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            inputMode="decimal"
            placeholder="—"
            disabled={busy}
            aria-label={`${contractLabel(position)} 目前權利金`}
            className="w-24 rounded-md border border-line bg-sand/40 px-2 py-1.5 text-sm tabular-nums text-ink outline-none focus:border-ink/40"
          />
        </label>
        {expired && position.markPrice === null ? (
          <button
            type="button"
            onClick={() => {
              setDraft("0");
              void setMark(position.contractKey, 0);
            }}
            className="rounded-md border border-line px-2.5 py-1.5 text-xs text-ink/70"
          >
            已到期歸零
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-loss">
          {error}
        </p>
      ) : null}
    </li>
  );
}
