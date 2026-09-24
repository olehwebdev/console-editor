import type { ReactNode } from 'react';

/** A labelled group of choices in the form, with an optional hint under it. */
export function Choices({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="label-caps mb-1.5">{legend}</legend>
      {children}
      {hint ? <p className="text-[11.5px] leading-snug text-fg-subtle">{hint}</p> : null}
    </fieldset>
  );
}
