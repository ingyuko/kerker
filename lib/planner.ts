import type { LocalizedText } from "./types";
import { EXHIBITIONS_BY_ID } from "./data";

export type ItemType = "meal" | "visit" | "event" | "party" | "walk" | "free";

export interface PlanItem {
  /** Display time, e.g. "10:00", "15:00 & 15:30", "18:00–21:00". */
  time?: string;
  /** Venue or activity name (kept as-is; brand names stay in their own script). */
  title: string;
  note?: LocalizedText;
  type: ItemType;
  /** Links to an exhibition in the seed data (for map / details). */
  exhibitionId?: string;
  /** Free-text Google Maps query for venues not in the seed data. */
  mapQuery?: string;
  /** Special / not-to-miss item. */
  highlight?: boolean;
}

export interface PlannerDay {
  id: string;
  label: LocalizedText;
  date: string;
  theme: LocalizedText;
  meals: { breakfast: string; lunch: string; dinner: string };
  hotel: string;
  items: PlanItem[];
}

const HOTEL = "Copenhagen Scandic Palace";

export const PLANNER_DAYS: PlannerDay[] = [
  {
    id: "day-1",
    label: { zh: "第一天", en: "Day 1" },
    date: "2026.06.10 WED",
    theme: { zh: "門市巡禮・經典工藝", en: "Showrooms & Classics" },
    meals: { breakfast: "飯店 Hotel", lunch: "—", dinner: "Long Table（17位）" },
    hotel: HOTEL,
    items: [
      {
        time: "09:00",
        title: "早餐 Breakfast",
        note: { zh: "於飯店", en: "At the hotel" },
        type: "meal",
      },
      {
        time: "10:00",
        title: "Carl Hansen & Søn",
        note: { zh: "Showroom・10:30 Wegner 女兒分享", en: "Showroom · 10:30 talk by Wegner's daughter" },
        type: "visit",
        exhibitionId: "carl-hansen-son",
        highlight: true,
      },
      {
        time: "12:30",
        title: "Fredericia",
        note: { zh: "門市", en: "Store" },
        type: "visit",
        exhibitionId: "fredericia",
      },
      {
        title: "3daysofdesign 自由活動",
        note: { zh: "下午自由探索", en: "Free exploration in the afternoon" },
        type: "free",
      },
      {
        time: "15:00 & 15:30",
        title: "Fritz Hansen · Sound Club Exhibition",
        note: { zh: "⭐ 特別活動", en: "Special event" },
        type: "event",
        mapQuery: "Fritz Hansen Copenhagen",
        highlight: true,
      },
      {
        time: "晚餐 Dinner",
        title: "Long Table（17位）",
        note: { zh: "團體晚宴", en: "Group dinner for 17" },
        type: "meal",
      },
    ],
  },
  {
    id: "day-2",
    label: { zh: "第二天", en: "Day 2" },
    date: "2026.06.11 THU",
    theme: { zh: "早餐會・派對之夜", en: "Breakfast Meet & Party Night" },
    meals: { breakfast: "Vipp", lunch: "Vipp", dinner: "—" },
    hotel: HOTEL,
    items: [
      {
        time: "09:00",
        title: "VIPP 總部",
        note: { zh: "早餐會（含午餐）", en: "Breakfast meeting (lunch included)" },
        type: "event",
        mapQuery: "Vipp Copenhagen",
        highlight: true,
      },
      {
        title: "3daysofdesign 自由活動",
        note: { zh: "白天自由探索", en: "Free exploration during the day" },
        type: "free",
      },
      {
        time: "18:00–21:00",
        title: "Louis Poulsen",
        note: { zh: "Party Time", en: "Party" },
        type: "party",
        exhibitionId: "louis-poulsen",
      },
      {
        time: "18:00–00:00",
        title: "Muuto",
        note: { zh: "Party Time", en: "Party" },
        type: "party",
        mapQuery: "Muuto Copenhagen",
      },
      {
        time: "20:00–00:00",
        title: "TOM DIXON",
        note: { zh: "Party Time", en: "Party" },
        type: "party",
        mapQuery: "Tom Dixon Copenhagen",
      },
    ],
  },
  {
    id: "day-3",
    label: { zh: "第三天", en: "Day 3" },
    date: "2026.06.12 FRI",
    theme: { zh: "設計巡禮・城市散步", en: "Design Tour & City Walk" },
    meals: { breakfast: "飯店 Hotel", lunch: "Ferm Living", dinner: "—" },
    hotel: HOTEL,
    items: [
      {
        time: "09:00",
        title: "早餐 Breakfast",
        note: { zh: "於飯店", en: "At the hotel" },
        type: "meal",
      },
      {
        time: "10:00",
        title: "TOM DIXON",
        type: "visit",
        mapQuery: "Tom Dixon Copenhagen",
      },
      {
        time: "11:00",
        title: "FLOS",
        type: "visit",
        mapQuery: "Flos Copenhagen",
      },
      {
        time: "12:20",
        title: "Ferm Living 總部",
        note: { zh: "總部・午餐", en: "HQ · lunch" },
        type: "visit",
        mapQuery: "Ferm Living Copenhagen",
        highlight: true,
      },
      {
        time: "13:30–15:00",
        title: "Louis Poulsen City Walk",
        note: { zh: "城市散步導覽", en: "Guided city walk" },
        type: "walk",
        exhibitionId: "louis-poulsen",
      },
      {
        time: "15:00–16:00",
        title: "Muuto Showroom",
        type: "visit",
        mapQuery: "Muuto Copenhagen",
      },
      {
        title: "3daysofdesign 自由活動",
        note: { zh: "傍晚自由探索", en: "Free exploration in the evening" },
        type: "free",
      },
    ],
  },
];

/** Resolve the best maps URL for a plan item. */
export function planItemMapUrl(item: PlanItem): string | null {
  if (item.exhibitionId && EXHIBITIONS_BY_ID[item.exhibitionId]) {
    return EXHIBITIONS_BY_ID[item.exhibitionId].mapUrl;
  }
  if (item.mapQuery) {
    return `https://maps.google.com/?q=${encodeURIComponent(item.mapQuery)}`;
  }
  return null;
}
