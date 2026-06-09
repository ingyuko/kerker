import type { LocalizedText } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Bilingual block: Chinese primary, English as a smaller muted line beneath.
 * Used for headings and body paragraphs.
 */
export function Bi({
  text,
  as: Tag = "div",
  className,
  zhClassName,
  enClassName,
}: {
  text: LocalizedText;
  as?: "div" | "p" | "h1" | "h2" | "h3" | "span";
  className?: string;
  zhClassName?: string;
  enClassName?: string;
}) {
  return (
    <Tag className={className}>
      <span className={cn("block", zhClassName)} lang="zh-Hant">
        {text.zh}
      </span>
      <span className={cn("block text-ink/50", enClassName)} lang="en">
        {text.en}
      </span>
    </Tag>
  );
}

/**
 * Inline bilingual: "中文 English" on one line. Used in tight spots like
 * badges, chips, and nav items where stacking is too tall.
 */
export function BiInline({
  text,
  className,
  enClassName,
}: {
  text: LocalizedText;
  className?: string;
  enClassName?: string;
}) {
  return (
    <span className={className}>
      <span lang="zh-Hant">{text.zh}</span>
      <span className={cn("ml-1 text-[0.85em] opacity-70", enClassName)} lang="en">
        {text.en}
      </span>
    </span>
  );
}
