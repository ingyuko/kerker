import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { SavedList } from "@/components/saved-list";

export const metadata: Metadata = {
  title: "收藏 Saved · 3daysofdesign Guide",
  description: "Your shortlist of exhibitions, saved on this device.",
};

export default function SavedPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Your shortlist"
        title={{ zh: "收藏", en: "Saved" }}
        description={{
          zh: "你按過愛心的所有展覽,儲存在這台裝置上。",
          en: "Everything you've hearted, stored on this device.",
        }}
      />
      <SavedList />
    </main>
  );
}
