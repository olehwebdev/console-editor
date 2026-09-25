import type { ReactNode } from 'react';

/** A detail action's words: shown once the panel is wide enough, else the button is its icon (and title) alone. */
export function ActionLabel({ children }: { children: ReactNode }) {
  return <span className="hidden @min-[40rem]:inline">{children}</span>;
}
