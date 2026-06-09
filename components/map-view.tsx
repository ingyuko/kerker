"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Exhibition } from "@/lib/types";
import { PRIORITY_LABEL, TAG_LABELS, ZONE_LABELS } from "@/lib/types";

/** Marker colour by priority. */
const PRIORITY_COLOR: Record<Exhibition["priority"], string> = {
  "must-go": "#C8553D",
  "worth-it": "#222222",
  optional: "#8C857A",
};

/** A teardrop pin with a number, built as a Leaflet divIcon. */
function numberedIcon(n: number, color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:30px;height:30px;">
        <div style="
          width:30px;height:30px;border-radius:50% 50% 50% 0;
          background:${color};transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 5px rgba(34,34,34,0.35);
          border:2px solid #F5F2EB;">
          <span style="transform:rotate(45deg);color:#F5F2EB;font-size:13px;
            font-weight:600;font-family:ui-sans-serif,system-ui,sans-serif;
            line-height:1;">${n}</span>
        </div>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

/** Floating "locate me" button + the user-location dot. */
function LocateControl() {
  const map = useMap();
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);

  useMapEvents({
    locationfound(e) {
      setPos([e.latlng.lat, e.latlng.lng]);
      setLoading(false);
    },
    locationerror() {
      setLoading(false);
      alert("無法取得定位,請確認瀏覽器已允許定位權限。\nCould not get your location — please allow location access.");
    },
  });

  return (
    <>
      {pos ? (
        <CircleMarker
          center={pos}
          radius={8}
          pathOptions={{
            color: "#F5F2EB",
            weight: 3,
            fillColor: "#2E73C8",
            fillOpacity: 1,
          }}
        >
          <Popup>你在這裡 · You are here</Popup>
        </CircleMarker>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setLoading(true);
          map.locate({ setView: true, maxZoom: 15 });
        }}
        aria-label="定位我的位置 Locate me"
        className="absolute right-3 top-3 z-[1000] flex size-11 items-center justify-center rounded-full border border-line bg-paper text-ink shadow-md active:scale-95"
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" strokeWidth={1.75} />
        ) : (
          <LocateFixed className="size-5" strokeWidth={1.75} />
        )}
      </button>
    </>
  );
}

export default function MapView({
  exhibitions,
  numberById,
}: {
  exhibitions: Exhibition[];
  numberById: Record<string, number>;
}) {
  const bounds = exhibitions.map((e) => [e.lat, e.lng]) as [number, number][];

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40] }}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      {exhibitions.map((e) => {
        const n = numberById[e.id];
        return (
          <Marker
            key={e.id}
            position={[e.lat, e.lng]}
            icon={numberedIcon(n, PRIORITY_COLOR[e.priority])}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-[#222]">
                    {n}. {e.name}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-[#666]">
                  {ZONE_LABELS[e.zone].zh} {ZONE_LABELS[e.zone].en} ·{" "}
                  {PRIORITY_LABEL[e.priority].zh}
                </div>
                <div className="mt-1 text-[11px] text-[#888]">
                  {e.tags
                    .map((t) => TAG_LABELS[t]?.zh ?? t)
                    .join(" · ")}
                </div>
                <div className="mt-2 flex gap-3 text-[12px]">
                  <a
                    href={e.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#C8553D] underline"
                  >
                    路線 Directions
                  </a>
                  <a
                    href={e.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#222] underline"
                  >
                    官網 Website
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <LocateControl />
    </MapContainer>
  );
}
