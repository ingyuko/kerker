import type { LocalizedText } from "./types";

/** Three-day itinerary structure for the Planner page. */
export interface PlannerDay {
  id: string;
  label: LocalizedText;
  theme: LocalizedText;
  description: LocalizedText;
  /** Exhibition ids, in walking order. */
  exhibitionIds: string[];
}

export const PLANNER_DAYS: PlannerDay[] = [
  {
    id: "day-1",
    label: { zh: "第一天", en: "Day 1" },
    theme: { zh: "工藝與傳承", en: "Craft & Heritage" },
    description: {
      zh: "從定義丹麥工藝的職人開始。以木作、皮革與編輯式的克制,為三天定下基調。",
      en: "Start with the makers who define Danish craft. A grounding day in wood, leather, and editorial restraint.",
    },
    exhibitionIds: [
      "carl-hansen-son",
      "fredericia",
      "ark-journal",
      "composed-matter",
    ],
  },
  {
    id: "day-2",
    label: { zh: "第二天", en: "Day 2" },
    theme: { zh: "材質與體驗", en: "Material & Experience" },
    description: {
      zh: "肌理、織品,以及與日本的對話。在各站之間用咖啡和一場聆聽會調節步調。",
      en: "Texture, textile, and the Japan dialogue. Pace yourself with coffee and a listening session between stops.",
    },
    exhibitionIds: [
      "frama",
      "la-cabra",
      "kvadrat",
      "japanmade",
      "dynaudio-karimoku",
    ],
  },
  {
    id: "day-3",
    label: { zh: "第三天", en: "Day 3" },
    theme: { zh: "光與氛圍", en: "Light & Atmosphere" },
    description: {
      zh: "以光收尾。把最後幾站安排在黃昏,那時燈具與港景都最迷人。",
      en: "End on light. Plan the last stops for dusk, when the fixtures and the harbour are at their best.",
    },
    exhibitionIds: ["louis-poulsen", "ingo-maurer", "display", "other-circle"],
  },
];
