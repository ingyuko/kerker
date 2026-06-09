import type { Metadata } from "next";
import { MapPin, Navigation } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ExhibitionRow } from "@/components/exhibition-card";
import { Badge } from "@/components/ui/badge";
import { ZONES, ZONE_LABELS } from "@/lib/types";
import type { Zone, LocalizedText } from "@/lib/types";
import { EXHIBITIONS } from "@/lib/data";

export const metadata: Metadata = {
  title: "地圖 Map · 3daysofdesign Guide",
  description: "Explore Copenhagen design week by zone.",
};

/** Short orientation note per zone (static for now — Maps API comes later). */
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

export default function MapPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Explore by neighbourhood"
        title={{ zh: "地圖", en: "Map" }}
        description={{
          zh: "四個區域,依步行分組。Google 地圖整合即將推出——目前先點任一站在地圖開啟。",
          en: "Four zones, grouped for walking. Google Maps integration is coming — for now, tap any stop to open it in Maps.",
        }}
      />

      <div className="space-y-6 px-4 pb-4 pt-2">
        {ZONES.map((zone) => {
          const inZone = EXHIBITIONS.filter((e) => e.zone === zone);
          const mapsQuery = encodeURIComponent(`${zone}, Copenhagen`);
          const label = ZONE_LABELS[zone];

          return (
            <section key={zone} aria-labelledby={`zone-${zone}`}>
              <div className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id={`zone-${zone}`}
                      className="flex items-center gap-1.5 font-serif text-2xl leading-tight"
                    >
                      <MapPin className="size-5 shrink-0 text-ink/50" strokeWidth={1.5} />
                      {label.zh}
                      <span className="text-base text-ink/50">{label.en}</span>
                    </h2>
                    <p className="mt-2 max-w-prose text-[0.9rem] leading-relaxed text-ink/70" lang="zh-Hant">
                      {ZONE_NOTES[zone].zh}
                    </p>
                    <p className="mt-1 max-w-prose text-[0.8rem] leading-relaxed text-ink/45" lang="en">
                      {ZONE_NOTES[zone].en}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {inZone.length}
                  </Badge>
                </div>

                {/* Static map placeholder strip */}
                <a
                  href={`https://maps.google.com/?q=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-24 items-center justify-center gap-2 rounded-md border border-dashed border-line bg-[#ECE7DC] text-center text-sm font-medium text-ink/50 transition-colors hover:text-ink/70"
                >
                  <Navigation className="size-4 shrink-0" strokeWidth={1.5} />
                  在 Google 地圖開啟{label.zh} · Open in Maps
                </a>
              </div>

              <div className="mt-3 space-y-3">
                {inZone.map((e) => (
                  <ExhibitionRow key={e.id} exhibition={e} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
