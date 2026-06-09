import type { Metadata } from "next";
import { MapPin, Navigation } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ExhibitionRow } from "@/components/exhibition-card";
import { Badge } from "@/components/ui/badge";
import { ZONES } from "@/lib/types";
import type { Zone } from "@/lib/types";
import { EXHIBITIONS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Map · 3daysofdesign Guide",
  description: "Explore Copenhagen design week by zone.",
};

/** Short orientation note per zone (static for now — Maps API comes later). */
const ZONE_NOTES: Record<Zone, string> = {
  Frederiksstaden:
    "Stately and central, around Amalienborg. Galleries and editorial showrooms.",
  "City Center": "The dense core — heritage furniture houses within easy walking distance.",
  Nordhavn: "Reclaimed harbour district to the north. Studio spaces and concept stores.",
  Refshaleøen:
    "Post-industrial island across the water. Raw halls, big installations, golden-hour light.",
};

export default function MapPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Explore by neighbourhood"
        title="Map"
        description="Four zones, grouped for walking. Google Maps integration is coming — for now, tap any stop to open it in Maps."
      />

      <div className="space-y-6 px-4 pb-4 pt-2">
        {ZONES.map((zone) => {
          const inZone = EXHIBITIONS.filter((e) => e.zone === zone);
          const mapsQuery = encodeURIComponent(`${zone}, Copenhagen`);

          return (
            <section key={zone} aria-labelledby={`zone-${zone}`}>
              <div className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id={`zone-${zone}`}
                      className="flex items-center gap-1.5 font-serif text-2xl leading-tight"
                    >
                      <MapPin className="size-5 text-ink/50" strokeWidth={1.5} />
                      {zone}
                    </h2>
                    <p className="mt-2 max-w-prose text-[0.9rem] leading-relaxed text-ink/65">
                      {ZONE_NOTES[zone]}
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
                  className="mt-3 flex h-24 items-center justify-center gap-2 rounded-md border border-dashed border-line bg-[#ECE7DC] text-sm font-medium text-ink/50 transition-colors hover:text-ink/70"
                >
                  <Navigation className="size-4" strokeWidth={1.5} />
                  Open {zone} in Google Maps
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
