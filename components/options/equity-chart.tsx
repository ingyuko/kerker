"use client";

import { friendlyDate, signedMoney } from "@/lib/options/format";

const WIDTH = 320;
const HEIGHT = 76;
const PAD_Y = 8;

/**
 * Cumulative realized P&L over time — one series, so no legend; the heading
 * above it names the measure. The dashed zero line carries the above/below
 * polarity geometrically, so the colour is never the only signal.
 */
export function EquityChart({
  points,
}: {
  points: { date: string; cumulative: number }[];
}) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.cumulative);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  // A flat book would divide by zero; a 1-dollar span keeps the line centred.
  const span = max - min || 1;

  const x = (i: number) => (i / (points.length - 1)) * WIDTH;
  const y = (value: number) =>
    PAD_Y + (1 - (value - min) / span) * (HEIGHT - PAD_Y * 2);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];
  const positive = last.cumulative >= 0;
  const stroke = positive ? "#137A55" : "#C4451C";
  const zeroY = y(0);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`累積已實現損益走勢，從 ${friendlyDate(points[0].date)} 到 ${friendlyDate(last.date)}，目前 ${signedMoney(last.cumulative)}。詳細數字見下方每日列表。`}
      >
        {/* Zero reference — recessive, dashed, so it reads as a rule not data. */}
        <line
          x1={0}
          x2={WIDTH}
          y1={zeroY}
          y2={zeroY}
          stroke="#222222"
          strokeOpacity={0.18}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Only the latest point is marked — a dot on every day would be noise. */}
        <circle cx={x(points.length - 1)} cy={y(last.cumulative)} r={4} fill={stroke} />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[0.65rem] text-ink/45">
        <span>{points[0].date.slice(5).replace("-", "/")}</span>
        <span>{last.date.slice(5).replace("-", "/")}</span>
      </figcaption>
    </figure>
  );
}
