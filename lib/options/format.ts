/** Display helpers. Money is always USD — thinkorswim accounts settle in it. */

const MONEY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PREMIUM = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** `$1,234.56` — no sign, for costs and fees. */
export function money(value: number): string {
  return `$${MONEY.format(Math.abs(value))}`;
}

/** `+$1,234.56` / `-$1,234.56` — an explicit sign, for P&L. */
export function signedMoney(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${MONEY.format(Math.abs(value))}`;
}

/** Per-share premium as thinkorswim shows it. */
export function premium(value: number): string {
  return PREMIUM.format(value);
}

export function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Tailwind text colour for a P&L figure. Green up / red down, as in thinkorswim. */
export function pnlColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-ink/40";
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-ink/50";
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/** `3月9日（一）` for a YYYY-MM-DD market date. */
export function friendlyDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}月${d}日（${WEEKDAYS[weekday]}）`;
}

/** `2026/03/09` — unambiguous, for dense tables. */
export function shortDate(date: string): string {
  return date.replace(/-/g, "/");
}

/**
 * Fill time in New York, e.g. `03/10 15:40`. Trades are grouped by market
 * date, so showing the local Taipei clock here would put a fill under a date
 * its own timestamp appears to contradict.
 */
export function marketTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** `今天` / `昨天` / `還有 12 天` / `已到期 3 天`. */
export function expiryLabel(days: number): string {
  if (days === 0) return "今天到期";
  if (days === 1) return "明天到期";
  if (days > 0) return `還有 ${days} 天`;
  return `已過期 ${Math.abs(days)} 天`;
}
