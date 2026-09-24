// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { HEADING_H, ITEM_H, LIST_PAD } from './constants';
import type { Result, Row } from './types';

// Row keys: a heading's can't collide with an item's.
const HEADING_KEY_PREFIX = 'h:';
const ITEM_KEY_PREFIX = 'i:';

export function layoutRows(sections: { heading: string; results: Result[] }[]) {
  const rows: Row[] = [];
  const starts: number[] = [];
  const itemRows: number[] = [];
  let y = LIST_PAD;
  for (const [group, section] of sections.entries()) {
    rows.push({ kind: 'heading', key: `${HEADING_KEY_PREFIX}${section.heading}`, heading: section.heading });
    starts.push(y);
    y += HEADING_H;
    for (const result of section.results) {
      itemRows.push(rows.length);
      const key = `${ITEM_KEY_PREFIX}${section.heading}:${result.item.id}`;
      rows.push({ kind: 'item', key, result, ordinal: itemRows.length - 1, group });
      starts.push(y);
      y += ITEM_H;
    }
  }
  return { rows, starts, itemRows, total: y + LIST_PAD };
}
