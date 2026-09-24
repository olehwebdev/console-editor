import type { ReactNode } from 'react';

/** One overlay's demos, with its name and an optional note on how to drive it. */
export function Row({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-6 border-t border-line py-5">
      <div>
        <div className="text-[13px] font-medium text-fg">{title}</div>
        {note ? <div className="mt-1 text-xs text-fg-subtle">{note}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
