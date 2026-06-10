"use client";

import dynamic from "next/dynamic";

import type { Exhibition } from "@/lib/types";

// Leaflet touches `window`, so the map must only render in the browser.
const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#ECE7DC] text-sm text-ink/50">
      載入地圖中… Loading map…
    </div>
  ),
});

export function MapCanvas({
  exhibitions,
  numberById,
}: {
  exhibitions: Exhibition[];
  numberById: Record<string, number>;
}) {
  return (
    <div className="h-[60vh] min-h-[360px] w-full overflow-hidden rounded-lg border border-line">
      <MapView exhibitions={exhibitions} numberById={numberById} />
    </div>
  );
}
