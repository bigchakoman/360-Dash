import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  tagline,
  actions,
}: {
  eyebrow?: string;
  title: string;
  tagline?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">{title}</h1>
        {tagline && <p className="editorial text-[var(--color-ink-soft)] mt-1 text-lg">{tagline}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
