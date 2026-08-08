"use client";

import { friendlyDate, signedMoney } from "@/lib/options/format";
import type { DailyPnl } from "@/lib/options/types";

const WIDTH = 320;
const HEIGHT = 96;
const GAP = 2;
const RADIUS = 4;

/**
 * One bar per market day, drawn from a zero baseline: gains rise, losses fall.
 * Direction is the primary encoding and colour reinforces it, so the chart
 * still reads correctly without colour vision.
 */
export function DailyBars({ days }: { days: DailyPnl[] }) {
  // Oldest to newest, left to right.
  const series = [...days].reverse();
  if (series.length === 0) return null;

  const values = series.map((d) => d.realized);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const slot = WIDTH / series.length;
  const barWidth = Math.max(3, slot - GAP);
  const zeroY = (1 - (0 - min) / span) * HEIGHT;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`最近 ${series.length} 個有交易的日期，每日已實現損益。往上為獲利、往下為虧損。詳細數字見下方每日列表。`}
      >
        <line
          x1={0}
          x2={WIDTH}
          y1={zeroY}
          y2={zeroY}
          stroke="#222222"
          strokeOpacity={0.25}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {series.map((day, i) => {
          const x = i * slot + GAP / 2;
          const valueY = (1 - (day.realized - min) / span) * HEIGHT;
          const up = day.realized >= 0;
          return (
            <path
              key={day.date}
              d={barPath(x, zeroY, valueY, barWidth)}
              fill={up ? "#137A55" : "#C4451C"}
            >
              <title>{`${friendlyDate(day.date)}　${signedMoney(day.realized)}`}</title>
            </path>
          );
        })}
      </svg>
    </figure>
  );
}

/**
 * A bar anchored to the baseline with only its data-end rounded — the end at
 * the baseline stays square so bars read as sitting on the axis.
 */
function barPath(
  x: number,
  baselineY: number,
  valueY: number,
  width: number,
): string {
  const height = Math.abs(valueY - baselineY);
  // Give a zero day a visible sliver rather than nothing at all.
  if (height < 1) {
    return `M${x},${baselineY - 0.5}h${width}v1h${-width}Z`;
  }

  const r = Math.min(RADIUS, width / 2, height);
  const up = valueY < baselineY;
  const end = up ? valueY : valueY;
  const dir = up ? 1 : -1; // 1 = rounded corners are above the value line

  return [
    `M${x},${baselineY}`,
    `L${x},${end + r * dir}`,
    `Q${x},${end} ${x + r},${end}`,
    `L${x + width - r},${end}`,
    `Q${x + width},${end} ${x + width},${end + r * dir}`,
    `L${x + width},${baselineY}`,
    "Z",
  ].join(" ");
}
