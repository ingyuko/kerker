export type Zone =
  | "Frederiksstaden"
  | "City Center"
  | "Nordhavn"
  | "Refshaleøen";

export type Priority = "must-go" | "worth-it" | "optional";

export interface Exhibition {
  id: string;
  name: string;
  zone: Zone;
  priority: Priority;
  tags: string[];
  /** Image URLs. Placeholders for now — no real images yet. */
  images: string[];
  about: string;
  whyGo: string;
  whatToLookFor: string;
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

export const PRIORITY_LABEL: Record<Priority, string> = {
  "must-go": "Must Go",
  "worth-it": "Worth It",
  optional: "Optional",
};
