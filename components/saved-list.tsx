"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { ExhibitionCard } from "@/components/exhibition-card";
import { useSavedExhibitions } from "@/lib/useSavedExhibitions";
import { EXHIBITIONS_BY_ID } from "@/lib/data";

export function SavedList() {
  const { saved, hydrated } = useSavedExhibitions();

  // Avoid a hydration flash before localStorage is read.
  if (!hydrated) {
    return (
      <div className="px-4 py-16 text-center text-sm text-ink/40">Loading…</div>
    );
  }

  const exhibitions = saved
    .map((id) => EXHIBITIONS_BY_ID[id])
    .filter(Boolean);

  if (exhibitions.length === 0) {
    return (
      <div className="px-4 py-20 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-line bg-paper">
          <Heart className="size-6 text-ink/30" strokeWidth={1.5} />
        </div>
        <p className="mt-4 font-serif text-xl text-ink/70">No saved spots yet</p>
        <p className="mt-1 text-sm text-ink/50">
          Tap the heart on any exhibition to build your shortlist.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-medium hover:bg-paper/70"
        >
          Browse exhibitions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-4 pt-2">
      <p className="text-sm text-ink/55">
        {exhibitions.length} saved {exhibitions.length === 1 ? "spot" : "spots"}
      </p>
      {exhibitions.map((e) => (
        <ExhibitionCard key={e.id} exhibition={e} />
      ))}
    </div>
  );
}
