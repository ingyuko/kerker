"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import {
  type DraftLeg,
  DraftError,
  blankLeg,
  draftFromParsed,
  toExecutionInputs,
} from "@/components/options/draft-legs";
import { LegEditor } from "@/components/options/leg-editor";
import { useOptionsData } from "@/components/options/options-data";
import { api, prepareImage } from "@/lib/options/client";
import type { ParseResult } from "@/lib/options/parse-screenshot";
import { cn } from "@/lib/utils";

type Mode = "screenshot" | "manual";
interface Picked {
  preview: string;
  mediaType: "image/jpeg";
  data: string;
}

const MAX_IMAGES = 4;

export default function AddTradePage() {
  const router = useRouter();
  const { addExecutions } = useOptionsData();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("screenshot");
  const [images, setImages] = useState<Picked[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [legs, setLegs] = useState<DraftLeg[]>([]);
  const [strategy, setStrategy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSaved(0);
    setParseResult(null);
    setImages([]);
    setLegs(next === "manual" ? [blankLeg()] : []);
  }

  async function pickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    try {
      const room = MAX_IMAGES - images.length;
      const prepared = await Promise.all(
        files.slice(0, room).map((file) => prepareImage(file)),
      );
      setImages((current) => [...current, ...prepared]);
      if (files.length > room) {
        setError(`一次最多 ${MAX_IMAGES} 張，多餘的已略過。`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function runParse() {
    if (images.length === 0 || parsing) return;
    setParsing(true);
    setError(null);
    setParseResult(null);
    setSaved(0);

    try {
      const result = await api.post<ParseResult>(
        "/api/options/parse-screenshot",
        { images: images.map((i) => ({ mediaType: i.mediaType, data: i.data })) },
      );
      setParseResult(result);
      setLegs(result.legs.map(draftFromParsed));
      if (result.legs.length === 0 && result.warnings.length === 0) {
        setError("這張截圖裡沒有讀到選擇權成交紀錄。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  }

  /**
   * thinkorswim often shows only one combined price for a spread. Booking the
   * whole net premium on the leg that drives the trade keeps the strategy's
   * total P&L exact, as long as the legs are closed together.
   */
  function applyNetPrice() {
    if (!parseResult || parseResult.netPrice <= 0) return;
    const wanted = parseResult.netPriceDirection === "CREDIT" ? "SELL" : "BUY";
    const target = legs.findIndex((leg) => leg.side === wanted);
    const index = target === -1 ? 0 : target;

    setLegs((current) =>
      current.map((leg, i) =>
        i === index ? { ...leg, price: String(parseResult.netPrice) } : leg,
      ),
    );
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const inputs = toExecutionInputs(legs, {
        source: mode === "manual" ? "manual" : "screenshot",
        strategy,
        note,
      });
      await addExecutions(inputs);
      setSaved(inputs.length);
      setLegs(mode === "manual" ? [blankLeg()] : []);
      setImages([]);
      setParseResult(null);
      setStrategy("");
      setNote("");
    } catch (err) {
      setError(
        err instanceof DraftError || err instanceof Error
          ? err.message
          : String(err),
      );
    } finally {
      setSaving(false);
    }
  }

  const showNetPriceHelper =
    parseResult !== null &&
    parseResult.netPrice > 0 &&
    legs.length > 1 &&
    legs.every((leg) => leg.price.trim() === "" || Number(leg.price) === 0);

  return (
    <main className="pb-24">
      <header className="px-4 pb-3 pt-6">
        <h1 className="font-serif text-2xl text-ink">新增交易</h1>
        <p className="mt-0.5 text-xs text-ink/50">
          上傳 thinkorswim 截圖自動辨識，或手動填寫
        </p>
      </header>

      <div className="px-4">
        <div className="flex rounded-md border border-line bg-paper p-0.5">
          {(
            [
              { value: "screenshot", label: "截圖辨識" },
              { value: "manual", label: "手動輸入" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={mode === tab.value}
              onClick={() => switchMode(tab.value)}
              className={cn(
                "flex-1 rounded px-3 py-2 text-sm transition-colors",
                mode === tab.value
                  ? "bg-ink text-sand"
                  : "text-ink/60 hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "screenshot" ? (
        <section className="mt-4 px-4">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={pickFiles}
            className="hidden"
          />

          {images.length > 0 ? (
            <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((image, i) => (
                <div key={image.preview.slice(-32)} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.preview}
                    alt={`截圖 ${i + 1}`}
                    className="h-32 w-auto rounded-md border border-line"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImages((c) => c.filter((_, index) => index !== i))
                    }
                    aria-label={`移除截圖 ${i + 1}`}
                    className="absolute right-1 top-1 rounded-full bg-ink/80 p-1 text-sand"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-line bg-paper px-4 py-3 text-sm text-ink disabled:opacity-40"
            >
              <Camera className="size-4" />
              {images.length === 0 ? "選擇截圖" : "再加一張"}
            </button>
            <button
              type="button"
              onClick={() => void runParse()}
              disabled={images.length === 0 || parsing}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm text-sand disabled:opacity-40"
            >
              {parsing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {parsing ? "辨識中…" : "辨識"}
            </button>
          </div>

          {parsing ? (
            <p className="mt-3 text-center text-xs text-ink/50">
              正在讀取截圖，通常需要 10–30 秒。
            </p>
          ) : images.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-ink/50">
              成交後在 thinkorswim 截下 Order Status 或 Activity
              畫面即可；有顯示各腳成交價的畫面最準確。同一筆交易可以一次上傳多張
              （例如需要往下捲的長清單）。辨識結果一定會先讓你核對再存檔。
            </p>
          ) : null}
        </section>
      ) : null}

      {parseResult?.warnings.length ? (
        <section className="mt-4 px-4">
          <div className="rounded-lg border border-loss/30 bg-loss/5 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-loss">
              <AlertTriangle className="size-3.5" />
              辨識時要注意
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-loss/90">
              {parseResult.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {showNetPriceHelper ? (
        <section className="mt-3 px-4">
          <div className="rounded-lg border border-line bg-paper p-3">
            <p className="text-xs text-ink/70">
              截圖只顯示整組的
              {parseResult.netPriceDirection === "CREDIT" ? "淨收" : "淨付"}價{" "}
              <span className="font-medium text-ink">{parseResult.netPrice}</span>
              ，沒有各腳價格。可以把淨價記在主要那一腳、其餘填 0 — 只要整組同時
              平倉，總損益就會正確。
            </p>
            <button
              type="button"
              onClick={applyNetPrice}
              className="mt-2 rounded-md border border-line bg-sand/60 px-3 py-1.5 text-xs text-ink"
            >
              套用淨價
            </button>
          </div>
        </section>
      ) : null}

      {legs.length > 0 ? (
        <section className="mt-4 space-y-3 px-4">
          {legs.map((leg, i) => (
            <LegEditor
              key={leg.key}
              leg={leg}
              index={i}
              total={legs.length}
              onChange={(patch) =>
                setLegs((current) =>
                  current.map((item, index) =>
                    index === i ? { ...item, ...patch } : item,
                  ),
                )
              }
              onRemove={
                legs.length > 1
                  ? () =>
                      setLegs((current) =>
                        current.filter((_, index) => index !== i),
                      )
                  : undefined
              }
            />
          ))}

          <button
            type="button"
            onClick={() =>
              setLegs((current) => [
                ...current,
                blankLeg({
                  underlying: current[0]?.underlying ?? "",
                  expiry: current[0]?.expiry ?? "",
                  tradedAt: current[0]?.tradedAt,
                  side: current[0]?.side === "SELL" ? "BUY" : "SELL",
                  right: current[0]?.right ?? "P",
                }),
              ])
            }
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line px-4 py-2.5 text-sm text-ink/60"
          >
            <Plus className="size-4" />
            再加一腳（價差、鐵兀鷹）
          </button>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-widest text-ink/45">
                策略名稱（選填）
              </span>
              <input
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="Put Credit Spread"
                className="w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/40"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-widest text-ink/45">
                備註（選填）
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="開倉理由…"
                className="w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/40"
              />
            </label>
          </div>
        </section>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-md border border-loss/30 bg-loss/5 px-3 py-2 text-sm text-loss"
        >
          {error}
        </p>
      ) : null}

      {saved > 0 ? (
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-md border border-profit/30 bg-profit/5 px-3 py-2 text-sm text-profit">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            已儲存 {saved} 筆
          </span>
          <button
            type="button"
            onClick={() => router.push("/options")}
            className="underline underline-offset-2"
          >
            看每日損益
          </button>
        </div>
      ) : null}

      {legs.length > 0 ? (
        <div className="mt-4 px-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-medium text-sand disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "儲存中…" : `儲存 ${legs.length} 腳`}
          </button>
          <p className="mt-2 text-center text-[0.7rem] text-ink/45">
            系統會自動用先進先出配對開倉與平倉，算出每天的已實現損益。
          </p>
        </div>
      ) : null}
    </main>
  );
}
