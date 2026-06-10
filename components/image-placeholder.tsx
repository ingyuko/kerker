import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Editorial placeholder used in place of real imagery. Deterministic tint based
 * on a seed so the three images per card differ subtly.
 */
const TINTS = ["bg-[#ECE7DC]", "bg-[#E4DED1]", "bg-[#EFEAE0]", "bg-[#E7E2D6]"];

export function ImagePlaceholder({
  seed,
  className,
  label,
}: {
  seed: number;
  className?: string;
  label?: string;
}) {
  const tint = TINTS[seed % TINTS.length];
  return (
    <div
      className={cn(
        "flex items-center justify-center text-ink/25",
        tint,
        className,
      )}
      role="img"
      aria-label={label ?? "Image placeholder"}
    >
      <ImageIcon className="size-6" strokeWidth={1.25} />
    </div>
  );
}
