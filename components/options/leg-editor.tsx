"use client";

import { Trash2 } from "lucide-react";

import type { DraftLeg } from "./draft-legs";
import type { ExecutionKind, OptionRight, Side } from "@/lib/options/types";
import { cn } from "@/lib/utils";

const KINDS: { value: ExecutionKind; label: string }[] = [
  { value: "TRADE", label: "成交" },
  { value: "EXPIRE", label: "到期" },
  { value: "ASSIGN", label: "被指派" },
  { value: "EXERCISE", label: "行權" },
];

/**
 * Editable form for one leg. Screenshot-parsed legs land here before anything
 * is saved — reading money off an image is a draft, never a fact.
 */
export function LegEditor({
  leg,
  index,
  total,
  onChange,
  onRemove,
}: {
  leg: DraftLeg;
  index: number;
  total: number;
  onChange: (patch: Partial<DraftLeg>) => void;
  onRemove?: () => void;
}) {
  const lowConfidence = leg.confidence !== undefined && leg.confidence < 0.8;

  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-ink/45">
          {total > 1 ? `第 ${index + 1} 腳` : "交易內容"}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`刪除第 ${index + 1} 腳`}
            className="rounded p-1 text-ink/40 hover:text-loss"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      {leg.sourceText ? (
        <p
          className={cn(
            "mb-3 rounded border px-2 py-1.5 text-[0.7rem] leading-snug",
            lowConfidence
              ? "border-loss/30 bg-loss/5 text-loss"
              : "border-line bg-sand/60 text-ink/55",
          )}
        >
          辨識自：{leg.sourceText}
          {lowConfidence
            ? `　（把握度 ${Math.round((leg.confidence ?? 0) * 100)}%，請仔細核對）`
            : ""}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Field label="標的" className="col-span-2">
          <input
            value={leg.underlying}
            onChange={(e) => onChange({ underlying: e.target.value.toUpperCase() })}
            placeholder="SPY"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={inputClass}
          />
        </Field>

        <Field label="買賣">
          <Segmented<Side>
            value={leg.side}
            options={[
              { value: "BUY", label: "買進" },
              { value: "SELL", label: "賣出" },
            ]}
            onChange={(side) => onChange({ side })}
          />
        </Field>

        <Field label="Call / Put">
          <Segmented<OptionRight>
            value={leg.right}
            options={[
              { value: "C", label: "Call" },
              { value: "P", label: "Put" },
            ]}
            onChange={(right) => onChange({ right })}
          />
        </Field>

        <Field label="履約價">
          <input
            value={leg.strike}
            onChange={(e) => onChange({ strike: e.target.value })}
            inputMode="decimal"
            placeholder="500"
            className={inputClass}
          />
        </Field>

        <Field label="到期日">
          <input
            type="date"
            value={leg.expiry}
            onChange={(e) => onChange({ expiry: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="口數">
          <input
            value={leg.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            inputMode="numeric"
            placeholder="1"
            className={inputClass}
          />
        </Field>

        <Field label="權利金（每股）">
          <input
            value={leg.price}
            onChange={(e) => onChange({ price: e.target.value })}
            inputMode="decimal"
            placeholder="1.85"
            className={inputClass}
          />
        </Field>

        <Field label="手續費">
          <input
            value={leg.fees}
            onChange={(e) => onChange({ fees: e.target.value })}
            inputMode="decimal"
            placeholder="0"
            className={inputClass}
          />
        </Field>

        <Field label="類型">
          <select
            value={leg.kind}
            onChange={(e) => onChange({ kind: e.target.value as ExecutionKind })}
            className={inputClass}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="成交時間" className="col-span-2">
          <input
            type="datetime-local"
            value={leg.tradedAt}
            onChange={(e) => onChange({ tradedAt: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      {leg.price !== "" && Number(leg.price) > 0 && Number(leg.quantity) > 0 ? (
        <p className="mt-2 text-[0.7rem] text-ink/50">
          {leg.side === "SELL" ? "收到" : "付出"}權利金 $
          {(Number(leg.price) * Number(leg.quantity) * 100).toFixed(2)}
          {Number(leg.fees) > 0 ? `，手續費 $${Number(leg.fees).toFixed(2)}` : ""}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-sand/40 px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/40";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[0.65rem] uppercase tracking-widest text-ink/45">
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-line bg-sand/40 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded px-2 py-1.5 text-sm transition-colors",
            value === option.value
              ? "bg-ink text-sand"
              : "text-ink/60 hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
