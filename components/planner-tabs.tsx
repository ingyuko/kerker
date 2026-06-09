"use client";

import { MapPin } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExhibitionRow } from "@/components/exhibition-card";
import { PLANNER_DAYS } from "@/lib/planner";
import { EXHIBITIONS_BY_ID } from "@/lib/data";

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

      {PLANNER_DAYS.map((day) => {
        const exhibitions = day.exhibitionIds
          .map((id) => EXHIBITIONS_BY_ID[id])
          .filter(Boolean);

        return (
          <TabsContent key={day.id} value={day.id}>
            <div className="rounded-lg border border-line bg-paper p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink/45">
                {day.label.zh} · {exhibitions.length} 站 · {day.label.en}
              </p>
              <h2 className="mt-1 font-serif text-2xl leading-tight">
                {day.theme.zh}
                <span className="ml-2 text-base text-ink/50">
                  {day.theme.en}
                </span>
              </h2>
              <p
                className="mt-2 text-[0.95rem] leading-relaxed text-ink/75"
                lang="zh-Hant"
              >
                {day.description.zh}
              </p>
              <p
                className="mt-1 text-[0.85rem] leading-relaxed text-ink/50"
                lang="en"
              >
                {day.description.en}
              </p>
            </div>

            <ol className="mt-4 space-y-3">
              {exhibitions.map((e, i) => (
                <li key={e.id} className="flex items-stretch gap-3">
                  {/* Route step indicator */}
                  <div className="flex flex-col items-center pt-1">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-sand">
                      {i + 1}
                    </span>
                    {i < exhibitions.length - 1 ? (
                      <span className="mt-1 w-px flex-1 bg-line" aria-hidden />
                    ) : null}
                  </div>
                  <div className="flex-1 pb-1">
                    <ExhibitionRow exhibition={e} />
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink/45">
              <MapPin className="size-3.5" strokeWidth={1.75} />
              點任一站可在地圖開啟 · Tap a stop to open it in Maps
            </p>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
