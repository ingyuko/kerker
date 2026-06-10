"use client";

import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSavedExhibitions } from "@/lib/useSavedExhibitions";

export function SaveButton({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const { isSaved, toggle, hydrated } = useSavedExhibitions();
  const saved = hydrated && isSaved(id);

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper/90 backdrop-blur transition-colors hover:bg-sand active:scale-95",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-5 transition-all",
          saved ? "fill-[#C8553D] text-[#C8553D]" : "text-ink/60",
        )}
        strokeWidth={1.75}
      />
    </button>
  );
}
