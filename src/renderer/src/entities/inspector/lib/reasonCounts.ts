import type { RenderReasonKind } from '@common/types';

/** How often each reason made a component render, the most frequent first: `state 5 · props 2`; null when none. */
export function reasonCounts(reasons: Partial<Record<RenderReasonKind, number>>): string | null {
  const counted = Object.entries(reasons).sort(([, a], [, b]) => b - a);
  return counted.length ? counted.map(([kind, count]) => `${kind} ${count}`).join(' · ') : null;
}
