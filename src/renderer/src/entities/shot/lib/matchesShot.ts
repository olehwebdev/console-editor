import type { Shot } from '@common/types';

/** Whether a shot answers a search: every word in its name, page address or browser. */
export function matchesShot(shot: Shot, query: string): boolean {
  const text = `${shot.name} ${shot.pageUrl ?? ''} ${shot.browser?.name ?? ''} ${shot.kind}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
