/** Three-day itinerary structure for the Planner page. */
export interface PlannerDay {
  id: string;
  label: string;
  theme: string;
  description: string;
  /** Exhibition ids, in walking order. */
  exhibitionIds: string[];
}

export const PLANNER_DAYS: PlannerDay[] = [
  {
    id: "day-1",
    label: "Day 1",
    theme: "Craft & Heritage",
    description:
      "Start with the makers who define Danish craft. A grounding day in wood, leather, and editorial restraint.",
    exhibitionIds: [
      "carl-hansen-son",
      "fredericia",
      "ark-journal",
      "composed-matter",
    ],
  },
  {
    id: "day-2",
    label: "Day 2",
    theme: "Material & Experience",
    description:
      "Texture, textile, and the Japan dialogue. Pace yourself with coffee and a listening session between stops.",
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
    label: "Day 3",
    theme: "Light & Atmosphere",
    description:
      "End on light. Plan the last stops for dusk, when the fixtures and the harbour are at their best.",
    exhibitionIds: ["louis-poulsen", "ingo-maurer", "display", "other-circle"],
  },
];
