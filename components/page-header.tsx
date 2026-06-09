import type { LocalizedText } from "@/lib/types";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: LocalizedText;
  description?: LocalizedText;
}) {
  return (
    <header className="px-4 pb-2 pt-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink/45">
        {eyebrow}
      </p>
      <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tight">
        {title.zh}
        <span className="ml-2 align-middle text-xl text-ink/45">
          {title.en}
        </span>
      </h1>
      {description ? (
        <div className="mt-2 max-w-prose">
          <p className="text-[0.95rem] leading-relaxed text-ink/65" lang="zh-Hant">
            {description.zh}
          </p>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-ink/45" lang="en">
            {description.en}
          </p>
        </div>
      ) : null}
    </header>
  );
}
