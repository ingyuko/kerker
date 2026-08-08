"use client";

import { useMemo } from "react";
import { LogOut, RefreshCw } from "lucide-react";

import { DailyBars } from "@/components/options/daily-bars";
import { DailyList } from "@/components/options/daily-list";
import { EquityChart } from "@/components/options/equity-chart";
import { useOptionsData } from "@/components/options/options-data";
import { marketDate } from "@/lib/options/contract";
import {
  friendlyDate,
  money,
  percent,
  pnlColor,
  signedMoney,
} from "@/lib/options/format";
import { equityCurve } from "@/lib/options/pnl";
import { cn } from "@/lib/utils";

/** Recent days shown in the bar chart; the list below covers the rest. */
const CHART_DAYS = 14;

export default function DailyPnlPage() {
  const { summary, positions, unrealized, unmarkedCount, refresh, signOut } =
    useOptionsData();

  const curve = useMemo(() => equityCurve(summary.daily), [summary.daily]);
  // Only days that actually booked something belong in the bars — a chart of
  // mostly-zero bars hides the days that matter.
  const barDays = useMemo(
    () => summary.daily.filter((d) => d.closes > 0).slice(0, CHART_DAYS),
    [summary.daily],
  );

  const latest = summary.daily[0];
  // The newest day in the book is not necessarily today — after a quiet week
  // it would be misleading to label a stale figure "今天".
  const isToday = latest?.date === marketDate(new Date());
  const openCount = positions.length;

  return (
    <main className="pb-24">
      <header className="flex items-center justify-between px-4 pb-2 pt-6">
        <div>
          <h1 className="font-serif text-2xl text-ink">每日損益</h1>
          <p className="mt-0.5 text-xs text-ink/50">選擇權交易紀錄</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="重新整理"
            className="rounded-md p-2 text-ink/50 hover:text-ink"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="登出"
            className="rounded-md p-2 text-ink/50 hover:text-ink"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Hero: the two numbers the app exists to answer. */}
      <section className="px-4">
        <div className="rounded-lg border border-line bg-paper p-4">
          <p className="text-xs uppercase tracking-widest text-ink/45">
            累積已實現
          </p>
          <p
            className={cn(
              "mt-1 font-serif text-4xl tabular-nums",
              pnlColor(summary.totalRealized),
            )}
          >
            {signedMoney(summary.totalRealized)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-3">
            <div>
              <p className="text-xs text-ink/45">未實現（依手動報價）</p>
              <p
                className={cn(
                  "mt-0.5 font-serif text-xl tabular-nums",
                  openCount === 0 ? "text-ink/35" : pnlColor(unrealized),
                )}
              >
                {openCount === 0 ? "—" : signedMoney(unrealized)}
              </p>
              {unmarkedCount > 0 ? (
                <p className="mt-0.5 text-[0.65rem] text-ink/45">
                  {unmarkedCount} 個部位尚未報價
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs text-ink/45">
                {isToday ? "今天" : "最近交易日"}
              </p>
              <p
                className={cn(
                  "mt-0.5 font-serif text-xl tabular-nums",
                  !latest || latest.closes === 0
                    ? "text-ink/35"
                    : pnlColor(latest.realized),
                )}
              >
                {!latest || latest.closes === 0
                  ? "—"
                  : signedMoney(latest.realized)}
              </p>
              {latest ? (
                <p className="mt-0.5 text-[0.65rem] text-ink/45">
                  {friendlyDate(latest.date)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {barDays.length > 1 ? (
        <section className="mt-4 px-4">
          <div className="rounded-lg border border-line bg-paper p-4">
            <h2 className="text-xs uppercase tracking-widest text-ink/45">
              最近 {barDays.length} 個交易日
            </h2>
            <div className="mt-3">
              <DailyBars days={barDays} />
            </div>
          </div>
        </section>
      ) : null}

      {curve.length > 1 ? (
        <section className="mt-4 px-4">
          <div className="rounded-lg border border-line bg-paper p-4">
            <h2 className="text-xs uppercase tracking-widest text-ink/45">
              累積損益曲線
            </h2>
            <div className="mt-3">
              <EquityChart points={curve} />
            </div>
          </div>
        </section>
      ) : null}

      {summary.wins + summary.losses > 0 ? (
        <section className="mt-4 grid grid-cols-2 gap-3 px-4">
          <Tile
            label="勝率"
            value={summary.winRate === null ? "—" : percent(summary.winRate)}
            hint={`${summary.wins} 賺 / ${summary.losses} 賠`}
          />
          <Tile
            label="盈虧比"
            value={
              summary.profitFactor === null
                ? "—"
                : summary.profitFactor.toFixed(2)
            }
            hint="總獲利 ÷ 總虧損"
          />
          <Tile
            label="平均獲利"
            value={summary.avgWin === null ? "—" : signedMoney(summary.avgWin)}
            valueClass={pnlColor(summary.avgWin)}
          />
          <Tile
            label="平均虧損"
            value={summary.avgLoss === null ? "—" : signedMoney(summary.avgLoss)}
            valueClass={pnlColor(summary.avgLoss)}
          />
          <Tile
            label="最好的一天"
            value={
              summary.bestDay ? signedMoney(summary.bestDay.realized) : "—"
            }
            hint={summary.bestDay ? friendlyDate(summary.bestDay.date) : undefined}
            valueClass={pnlColor(summary.bestDay?.realized ?? null)}
          />
          <Tile
            label="最差的一天"
            value={
              summary.worstDay ? signedMoney(summary.worstDay.realized) : "—"
            }
            hint={
              summary.worstDay ? friendlyDate(summary.worstDay.date) : undefined
            }
            valueClass={pnlColor(summary.worstDay?.realized ?? null)}
          />
          <Tile
            label="累積手續費"
            value={money(summary.totalFees)}
            hint="含未平倉部位"
          />
          <Tile
            label="未平倉"
            value={String(openCount)}
            hint={openCount > 0 ? "個合約" : undefined}
          />
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="px-4 pb-2 text-xs uppercase tracking-widest text-ink/45">
          每日明細
        </h2>
        <DailyList days={summary.daily} />
      </section>
    </main>
  );
}

function Tile({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <p className="text-[0.65rem] uppercase tracking-widest text-ink/45">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-serif text-lg tabular-nums text-ink",
          valueClass,
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[0.65rem] text-ink/45">{hint}</p> : null}
    </div>
  );
}
