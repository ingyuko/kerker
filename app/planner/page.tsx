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
        eyebrow="Three days, three themes"
        title={{ zh: "行程規劃", en: "Planner" }}
        description={{
          zh: "每一天的建議路線。可步行、有主題,並以一次逛一個區域的節奏安排。",
          en: "A suggested route for each day. Walkable, themed, and paced for one neighbourhood at a time.",
        }}
      />
      <PlannerTabs />
    </main>
  );
}
