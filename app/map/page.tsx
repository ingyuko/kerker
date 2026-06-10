import type { Metadata } from "next";
import { MapPin, Hand, LocateFixed } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ExhibitionRow } from "@/components/exhibition-card";
import { MapCanvas } from "@/components/map-canvas";
import { Badge } from "@/components/ui/badge";
import { ZONES, ZONE_LABELS } from "@/lib/types";
import type { Zone, LocalizedText } from "@/lib/types";
import { EXHIBITIONS } from "@/lib/data";

export const metadata: Metadata = {
  title: "地圖 Map · 3daysofdesign Guide",
  description: "Explore Copenhagen design week on an interactive map.",
};

/** Short orientation note per zone. */
const ZONE_NOTES: Record<Zone, LocalizedText> = {
  Frederiksstaden: {
    zh: "莊重而中心,環繞阿馬林堡宮。畫廊與編輯式展示間聚集。",
    en: "Stately and central, around Amalienborg. Galleries and editorial showrooms.",
  },
  "City Center": {
    zh: "緊湊的核心——傳統家具世家彼此步行可達。",
    en: "The dense core — heritage furniture houses within easy walking distance.",
  },
  Nordhavn: {
    zh: "北側的再生港區。工作室空間與概念選物店。",
    en: "Reclaimed harbour district to the north. Studio spaces and concept stores.",
  },
  Refshaleøen: {
    zh: "水另一側的後工業島嶼。粗獷大廳、大型裝置、黃金時刻的光。",
    en: "Post-industrial island across the water. Raw halls, big installations, golden-hour light.",
  },
};

// Stable 1-based numbering shared between the map pins and the list below.
const NUMBER_BY_ID: Record<string, number> = Object.fromEntries(
  EXHIBITIONS.map((e, i) => [e.id, i + 1]),
);

export default function MapPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Explore on the map"
        title={{ zh: "地圖", en: "Map" }}
        description={{
          zh: "13 個展覽都標在地圖上。點圖釘看資訊,按右上角的定位鍵找到自己的位置。",
          en: "All 13 exhibitions on one map. Tap a pin for details, or use the locate button to find yourself.",
        }}
      />

      <div className="px-4 pt-2">
        <MapCanvas exhibitions={EXHIBITIONS} numberById={NUMBER_BY_ID} />

        {/* Hints + legend */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/55">
          <span className="flex items-center gap-1">
            <Hand className="size-3.5" strokeWidth={1.75} /> 點圖釘看資訊 Tap a pin
          </span>
          <span className="flex items-center gap-1">
            <LocateFixed className="size-3.5" strokeWidth={1.75} /> 右上角定位 Locate me
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/55">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-[#C8553D]" /> 必去 Must Go
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-[#222222]" /> 值得去 Worth It
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-[#8C857A]" /> 可選 Optional
          </span>
        </div>
      </div>

      {/* Zone-grouped index, numbered to match the pins */}
      <div className="space-y-6 px-4 pb-4 pt-5">
        {ZONES.map((zone) => {
          const inZone = EXHIBITIONS.filter((e) => e.zone === zone);
          const label = ZONE_LABELS[zone];

          return (
            <section key={zone} aria-labelledby={`zone-${zone}`}>
              <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                <h2
                  id={`zone-${zone}`}
                  className="flex items-center gap-1.5 font-serif text-xl leading-tight"
                >
                  <MapPin className="size-4 shrink-0 text-ink/50" strokeWidth={1.5} />
                  {label.zh}
                  <span className="text-sm text-ink/50">{label.en}</span>
                </h2>
                <Badge variant="outline" className="shrink-0">
                  {inZone.length}
                </Badge>
              </div>
              <p className="mt-2 max-w-prose text-[0.85rem] leading-relaxed text-ink/65">
                {ZONE_NOTES[zone].zh}
              </p>

              <div className="mt-3 space-y-3">
                {inZone.map((e) => (
                  <div key={e.id} className="flex items-stretch gap-2">
                    <span className="mt-3 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-sand">
                      {NUMBER_BY_ID[e.id]}
                    </span>
                    <div className="flex-1">
                      <ExhibitionRow exhibition={e} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
