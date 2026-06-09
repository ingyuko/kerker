export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="px-4 pb-2 pt-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink/45">
        {eyebrow}
      </p>
      <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-prose text-[0.95rem] leading-relaxed text-ink/60">
          {description}
        </p>
      ) : null}
    </header>
  );
}
