import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { SavedList } from "@/components/saved-list";

export const metadata: Metadata = {
  title: "Saved · 3daysofdesign Guide",
  description: "Your shortlist of exhibitions, saved on this device.",
};

export default function SavedPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Your shortlist"
        title="Saved"
        description="Everything you've hearted, stored on this device."
      />
      <SavedList />
    </main>
  );
}
