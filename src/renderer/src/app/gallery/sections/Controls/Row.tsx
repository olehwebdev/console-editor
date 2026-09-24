import type { ReactNode } from 'react';

/** One line of demos inside a Block, with an optional label on the left. */
export function Row({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? <span className="w-20 shrink-0 text-xs text-fg-subtle">{label}</span> : null}
      {children}
    </div>
  );
}
