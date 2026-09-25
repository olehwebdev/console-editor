import type { VirtualItem } from '@tanstack/react-virtual';
import { rowAt } from './rowAt';
import type { LogLayout } from './types';

/** The rows drawn, by commit (its index among those shown), in order: so each commit's rows stay together in the page. */
export function groupRows(items: readonly VirtualItem[], layout: LogLayout): Array<{ commit: number; rows: Array<{ item: VirtualItem; offset: number }> }> {
  const groups: Array<{ commit: number; rows: Array<{ item: VirtualItem; offset: number }> }> = [];
  for (const item of items) {
    const { commit, offset } = rowAt(layout, item.index);
    const last = groups.at(-1);
    if (last?.commit === commit) last.rows.push({ item, offset });
    else groups.push({ commit, rows: [{ item, offset }] });
  }
  return groups;
}
