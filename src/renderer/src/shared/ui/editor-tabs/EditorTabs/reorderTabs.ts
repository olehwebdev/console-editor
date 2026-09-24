// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { DropSide, EditorTabItem, EditorTabsProps } from './types';

/** Moves tab `id` before or after `target` and reports the new order, if anything moved. */
export function reorderTabs(
  items: readonly EditorTabItem[],
  onReorder: EditorTabsProps['onReorder'],
  id: string,
  target: string,
  side: DropSide,
) {
  if (!onReorder || id === target) return;
  const ids = items.map((item) => item.id);
  const from = ids.indexOf(id);
  if (from < 0) return;
  ids.splice(from, 1);
  const at = ids.indexOf(target);
  if (at < 0) return;
  ids.splice(side === 'after' ? at + 1 : at, 0, id);
  if (ids.some((value, i) => value !== items[i]?.id)) onReorder(ids);
}
