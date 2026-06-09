import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { PlannerTabs } from "@/components/planner-tabs";

export const metadata: Metadata = {
  title: "Planner · 3daysofdesign Guide",
  description: "A three-day route through Copenhagen design week.",
};

export default function PlannerPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Three days, three themes"
        title="Planner"
        description="A suggested route for each day. Walkable, themed, and paced for one neighbourhood at a time."
      />
      <PlannerTabs />
    </main>
  );
}
