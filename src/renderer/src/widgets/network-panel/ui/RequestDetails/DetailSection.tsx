import type { ReactNode } from 'react';

/** A titled part of a details view (General, Response headers…). */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="label-caps">{title}</h3>
      {children}
    </section>
  );
}
