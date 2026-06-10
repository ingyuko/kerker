"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import type { Exhibition, TagFilter, ZoneFilter } from "@/lib/types";
import { ExhibitionCard } from "@/components/exhibition-card";
import { FilterBar } from "@/components/filter-bar";

export function HomeBrowser({ exhibitions }: { exhibitions: Exhibition[] }) {
  const [selectedTags, setSelectedTags] = useState<TagFilter[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneFilter>("All");

  const toggleTag = (tag: TagFilter) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const clearAll = () => {
    setSelectedTags([]);
    setSelectedZone("All");
  };

  const filtered = useMemo(() => {
    return exhibitions.filter((e) => {
      // Tag filters use AND semantics: an exhibition must carry every
      // selected tag (e.g. "Yellow Nose" + "Curator Pick").
      const tagMatch = selectedTags.every((t) => e.tags.includes(t));
      const zoneMatch = selectedZone === "All" || e.zone === selectedZone;
      return tagMatch && zoneMatch;
    });
  }, [exhibitions, selectedTags, selectedZone]);

  const hasFilters = selectedTags.length > 0 || selectedZone !== "All";

  return (
    <div>
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30">
        <FilterBar
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
        />
      </div>

      {/* Result count + clear */}
      <div className="flex items-center justify-between px-4 pb-1 pt-4">
        <p className="flex items-center gap-1.5 text-sm text-ink/55">
          <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
          {filtered.length} 個展覽 · {filtered.length}{" "}
          {filtered.length === 1 ? "exhibition" : "exhibitions"}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-sm font-medium text-ink/55 hover:text-ink"
          >
            <X className="size-3.5" strokeWidth={2} /> 清除 Clear
          </button>
        ) : null}
      </div>

      {/* Cards */}
      {filtered.length > 0 ? (
        <div className="space-y-5 px-4 pb-4 pt-2">
          {filtered.map((e) => (
            <ExhibitionCard key={e.id} exhibition={e} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-16 text-center">
          <p className="font-serif text-xl text-ink/70">沒有符合的展覽</p>
          <p className="mt-1 text-sm text-ink/50">
            試著移除一個篩選條件,放寬搜尋範圍。
            <br />
            <span className="text-ink/40">
              Nothing matches — try removing a filter.
            </span>
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-4 rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium hover:bg-paper/70"
          >
            清除篩選 Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
