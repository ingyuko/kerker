export type Zone =
  | "Frederiksstaden"
  | "City Center"
  | "Nordhavn"
  | "Refshaleøen";

export type Priority = "must-go" | "worth-it" | "optional";

/** A piece of text in both Traditional Chinese and English. */
export interface LocalizedText {
  zh: string;
  en: string;
}

export interface Exhibition {
  id: string;
  name: string;
  zone: Zone;
  priority: Priority;
  /** English keys used for filtering. Display labels live in TAG_LABELS. */
  tags: string[];
  /** Image URLs. Placeholders for now — no real images yet. */
  images: string[];
  /** Approximate location in Copenhagen, for the interactive map. */
  lat: number;
  lng: number;
  about: LocalizedText;
  whyGo: LocalizedText;
  whatToLookFor: LocalizedText;
  websiteUrl: string;
  eventUrl: string;
  mapUrl: string;
}

/** Tag filters shown in the home filter bar. Order matters for display. */
export const TAG_FILTERS = [
  "Yellow Nose",
  "Curator Pick",
  "Hospitality",
  "Material",
  "Lighting",
  "Japan",
  "Must Go",
] as const;

export type TagFilter = (typeof TAG_FILTERS)[number];

/** Bilingual display labels for tags. */
export const TAG_LABELS: Record<string, LocalizedText> = {
  "Yellow Nose": { zh: "黃鼻子", en: "Yellow Nose" },
  "Curator Pick": { zh: "策展精選", en: "Curator Pick" },
  Hospitality: { zh: "餐飲款待", en: "Hospitality" },
  Material: { zh: "材質", en: "Material" },
  Lighting: { zh: "燈光", en: "Lighting" },
  Japan: { zh: "日本", en: "Japan" },
  "Must Go": { zh: "必去", en: "Must Go" },
};

/** Zone filter options. "All" is a virtual option meaning "no zone filter". */
export const ZONE_FILTERS = [
  "All",
  "Frederiksstaden",
  "City Center",
  "Nordhavn",
  "Refshaleøen",
] as const;

export type ZoneFilter = (typeof ZONE_FILTERS)[number];

export const ZONES: Zone[] = [
  "Frederiksstaden",
  "City Center",
  "Nordhavn",
  "Refshaleøen",
];

/** Bilingual display labels for zones (and the "All" filter). */
export const ZONE_LABELS: Record<ZoneFilter, LocalizedText> = {
  All: { zh: "全部", en: "All" },
  Frederiksstaden: { zh: "腓特烈城", en: "Frederiksstaden" },
  "City Center": { zh: "市中心", en: "City Center" },
  Nordhavn: { zh: "北港", en: "Nordhavn" },
  Refshaleøen: { zh: "雷夫斯哈倫島", en: "Refshaleøen" },
};

export const PRIORITY_LABEL: Record<Priority, LocalizedText> = {
  "must-go": { zh: "必去", en: "Must Go" },
  "worth-it": { zh: "值得去", en: "Worth It" },
  optional: { zh: "可選", en: "Optional" },
};
