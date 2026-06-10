"use client";

import {
  Store,
  Star,
  Sparkles,
  Footprints,
  Utensils,
  Coffee,
  MapPin,
  ExternalLink,
  Hotel,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PLANNER_DAYS, planItemMapUrl } from "@/lib/planner";
import type { ItemType, PlanItem } from "@/lib/planner";
import { cn } from "@/lib/utils";

const TYPE_META: Record<
  ItemType,
  { icon: typeof Store; color: string; ring: string }
> = {
  meal: { icon: Utensils, color: "text-[#8C857A]", ring: "border-[#DDD8CF] bg-paper" },
  visit: { icon: Store, color: "text-ink", ring: "border-ink bg-ink" },
  event: { icon: Star, color: "text-[#C8553D]", ring: "border-[#C8553D] bg-[#C8553D]" },
  party: { icon: Sparkles, color: "text-[#B8893D]", ring: "border-[#B8893D] bg-[#B8893D]" },
  walk: { icon: Footprints, color: "text-[#5E7A5E]", ring: "border-[#5E7A5E] bg-[#5E7A5E]" },
  free: { icon: Coffee, color: "text-ink/45", ring: "border-line bg-sand" },
};

function TimelineItem({ item, last }: { item: PlanItem; last: boolean }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const mapUrl = planItemMapUrl(item);
  const solidDot = ["visit", "event", "party", "walk"].includes(item.type);

  return (
    <li className="flex items-stretch gap-3">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border",
            meta.ring,
          )}
        >
          <Icon
            className={cn("size-3.5", solidDot ? "text-sand" : meta.color)}
            strokeWidth={2}
          />
        </span>
        {!last ? <span className="mt-1 w-px flex-1 bg-line" aria-hidden /> : null}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {item.time ? (
              <p className="text-xs font-semibold tabular-nums text-ink/55">
                {item.time}
              </p>
            ) : null}
            <p className="font-medium leading-snug text-ink">
              {item.highlight ? (
                <Star
                  className="mr-1 inline size-3.5 -translate-y-px fill-[#C8553D] text-[#C8553D]"
                  strokeWidth={1.5}
                />
              ) : null}
              {item.title}
            </p>
            {item.note ? (
              <p className="mt-0.5 text-[0.8rem] leading-snug text-ink/55">
                <span lang="zh-Hant">{item.note.zh}</span>
                <span className="text-ink/40"> · {item.note.en}</span>
              </p>
            ) : null}
          </div>

          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`在地圖開啟 ${item.title}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink/45 hover:bg-line/40 hover:text-ink"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} />
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function MealRow({
  label,
  zh,
  value,
}: {
  label: string;
  zh: string;
  value: string;
}) {
  const empty = value === "—";
  return (
    <div className="flex-1 px-2 py-1.5 text-center">
      <p className="text-[0.65rem] uppercase tracking-wider text-ink/40">
        {zh} {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[0.8rem] font-medium",
          empty ? "text-ink/30" : "text-ink/80",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PlannerTabs() {
  return (
    <Tabs defaultValue={PLANNER_DAYS[0].id} className="px-4">
      <TabsList>
        {PLANNER_DAYS.map((day) => (
          <TabsTrigger key={day.id} value={day.id}>
            {day.label.zh}
            <span className="ml-1 text-[0.7em] opacity-70">{day.label.en}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {PLANNER_DAYS.map((day) => (
        <TabsContent key={day.id} value={day.id}>
          {/* Day header */}
          <div className="rounded-lg border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink/45">
                {day.label.zh} · {day.label.en}
              </p>
              <p className="text-[0.7rem] font-semibold tabular-nums text-ink/45">
                {day.date}
              </p>
            </div>
            <h2 className="mt-1 font-serif text-2xl leading-tight">
              {day.theme.zh}
              <span className="ml-2 text-base text-ink/50">{day.theme.en}</span>
            </h2>

            {/* Meals summary */}
            <div className="mt-3 flex items-stretch divide-x divide-line rounded-md border border-line bg-sand/50">
              <MealRow label="Breakfast" zh="早餐" value={day.meals.breakfast} />
              <MealRow label="Lunch" zh="午餐" value={day.meals.lunch} />
              <MealRow label="Dinner" zh="晚餐" value={day.meals.dinner} />
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/50">
              <Hotel className="size-3.5" strokeWidth={1.75} />
              {day.hotel}
            </p>
          </div>

          {/* Timeline */}
          <ol className="mt-4">
            {day.items.map((item, i) => (
              <TimelineItem
                key={`${day.id}-${i}`}
                item={item}
                last={i === day.items.length - 1}
              />
            ))}
          </ol>

          <p className="mb-2 flex items-center justify-center gap-1.5 text-xs text-ink/45">
            <MapPin className="size-3.5" strokeWidth={1.75} />
            點任一站的箭頭可在地圖開啟 · Tap the arrow to open in Maps
          </p>
        </TabsContent>
      ))}
    </Tabs>
  );
}
