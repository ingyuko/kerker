import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { PlannerTabs } from "@/components/planner-tabs";

export const metadata: Metadata = {
  title: "行程 Planner · 3daysofdesign Guide",
  description: "A three-day route through Copenhagen design week.",
};

export default function PlannerPage() {
  return (
    <main>
      <PageHeader
        eyebrow="6/10 – 6/12 · Copenhagen"
        title={{ zh: "行程規劃", en: "Planner" }}
        description={{
          zh: "你的三天既定行程,含時間、餐食與特別活動。點站點旁的箭頭可開啟地圖。",
          en: "Your fixed three-day itinerary with times, meals, and special events. Tap the arrow by a stop to open it in Maps.",
        }}
      />
      <PlannerTabs />
    </main>
  );
}
