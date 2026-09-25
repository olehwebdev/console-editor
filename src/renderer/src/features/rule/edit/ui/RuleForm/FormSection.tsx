import type { ReactNode } from 'react';

/** A titled part of the rule form, with an optional hint under it. */
export function FormSection({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="label-caps">{title}</h2>
      {children}
      {hint ? <p className="text-[12px] leading-snug text-fg-subtle">{hint}</p> : null}
    </section>
  );
}
