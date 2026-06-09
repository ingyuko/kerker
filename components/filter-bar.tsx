"use client";

import { cn } from "@/lib/utils";
import { TAG_FILTERS, ZONE_FILTERS } from "@/lib/types";
import type { TagFilter, ZoneFilter } from "@/lib/types";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-ink bg-ink text-sand"
          : "border-line bg-paper text-ink/70 hover:border-ink/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  selectedTags,
  onToggleTag,
  selectedZone,
  onSelectZone,
}: {
  selectedTags: TagFilter[];
  onToggleTag: (tag: TagFilter) => void;
  selectedZone: ZoneFilter;
  onSelectZone: (zone: ZoneFilter) => void;
}) {
  return (
    <div className="space-y-2 border-b border-line bg-sand/95 pb-3 pt-2 backdrop-blur">
      {/* Tag chips — horizontally scrollable */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {TAG_FILTERS.map((tag) => (
          <Chip
            key={tag}
            active={selectedTags.includes(tag)}
            onClick={() => onToggleTag(tag)}
          >
            {tag}
          </Chip>
        ))}
      </div>

      {/* Zone chips — horizontally scrollable */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {ZONE_FILTERS.map((zone) => (
          <Chip
            key={zone}
            active={selectedZone === zone}
            onClick={() => onSelectZone(zone)}
          >
            {zone}
          </Chip>
        ))}
      </div>
    </div>
  );
}
