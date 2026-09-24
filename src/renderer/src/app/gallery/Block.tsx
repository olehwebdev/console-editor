import type { ReactNode } from 'react';

/** Card framing one component's demos in a gallery section: caps title, optional hint, stacked rows. */
export function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <header className="mb-3 flex items-baseline gap-3">
        <h3 className="label-caps">{title}</h3>
        {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
