"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { contractLabel } from "@/lib/options/contract";
import {
  friendlyDate,
  money,
  pnlColor,
  premium,
  signedMoney,
} from "@/lib/options/format";
import type { DailyPnl } from "@/lib/options/types";
import { cn } from "@/lib/utils";

/**
 * The day-by-day record, and the chart's table view: every figure the bars
 * encode is readable here as text.
 */
export function DailyList({ days }: { days: DailyPnl[] }) {
  if (days.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-ink/50">
        還沒有任何交易紀錄。到「新增」上傳一張 thinkorswim 截圖開始。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {days.map((day) => (
        <DayRow key={day.date} day={day} />
      ))}
    </ul>
  );
}

function DayRow({ day }: { day: DailyPnl }) {
  const [open, setOpen] = useState(false);
  const hasDetail = day.lots.length > 0;

  return (
    <li className="bg-paper">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        disabled={!hasDetail}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{friendlyDate(day.date)}</p>
          <p className="mt-0.5 text-xs text-ink/50">
            {day.closes > 0
              ? `平倉 ${day.closes} 筆・${day.wins} 賺 ${day.losses} 賠`
              : `${day.executions} 筆進場，尚未平倉`}
            {day.feesPaid > 0 ? `・手續費 ${money(day.feesPaid)}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "font-serif text-lg tabular-nums",
              day.closes === 0 ? "text-ink/35" : pnlColor(day.realized),
            )}
          >
            {day.closes === 0 ? "—" : signedMoney(day.realized)}
          </span>
          {hasDetail ? (
            <ChevronDown
              className={cn(
                "size-4 text-ink/35 transition-transform",
                open && "rotate-180",
              )}
            />
          ) : (
            <span className="size-4" />
          )}
        </div>
      </button>

      {open ? (
        <ul className="border-t border-line bg-sand/60 px-4 py-2">
          {day.lots.map((lot, i) => (
            <li
              key={`${lot.closeExecutionId}-${lot.openExecutionId}-${i}`}
              className="flex items-baseline justify-between gap-3 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate text-ink/80">
                  {contractLabel(lot)}
                  <span className="ml-1.5 text-ink/45">
                    {lot.direction === "LONG" ? "買進" : "賣出"} ×{lot.quantity}
                  </span>
                </p>
                <p className="mt-0.5 text-ink/45">
                  {premium(lot.openPrice)} → {premium(lot.closePrice)}
                  {lot.closeKind !== "TRADE" ? `・${KIND_LABEL[lot.closeKind]}` : ""}
                  {lot.fees > 0 ? `・費用 ${money(lot.fees)}` : ""}
                </p>
              </div>
              <span
                className={cn("shrink-0 tabular-nums", pnlColor(lot.netPnl))}
              >
                {signedMoney(lot.netPnl)}
              </span>
            </li>
          ))}
        </ul>
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
