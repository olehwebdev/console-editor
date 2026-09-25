// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { KeyboardEvent } from 'react';
import { KEY } from '@/shared/config';
import { EXITING_ATTR } from './constants';
import { reorderTabs } from './reorderTabs';
import { TAB_KEY_HANDLERS } from './tabKeyHandlers';
import type { DropSide, StripKeyContext } from './types';

/** The strip's tabs that keyboard navigation moves between: not the ones closing. */
const LIVE_TABS = `[role="tab"]:not([${EXITING_ATTR}])`;

/** Alt+Shift+←/→ moves the focused tab one place, before its left or after its right neighbour. */
const REORDER_KEYS: Record<string, { offset: 1 | -1; side: DropSide }> = {
  [KEY.arrowLeft]: { offset: -1, side: 'before' },
  [KEY.arrowRight]: { offset: 1, side: 'after' },
};

/** A key on focused tab `id`: Alt+Shift+←/→ reorders, the unmodified keys of `TAB_KEY_HANDLERS` do their part. */
export function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>, id: string, strip: StripKeyContext) {
  if (event.target !== event.currentTarget) return;
  const { scroller, items, onSelect, onClose, onReorder, pendingFocus } = strip;
  if (!scroller) return;
  const tabs = Array.from(scroller.querySelectorAll<HTMLElement>(LIVE_TABS));
  const index = tabs.indexOf(event.currentTarget);
  const reorderStep = Object.hasOwn(REORDER_KEYS, event.key) ? REORDER_KEYS[event.key] : undefined;

  if (reorderStep && event.altKey && event.shiftKey && onReorder) {
    const at = items.findIndex((item) => item.id === id);
    const neighbour = items[at + reorderStep.offset];
    if (neighbour) reorderTabs(items, onReorder, id, neighbour.id, reorderStep.side);
    event.preventDefault();
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (!Object.hasOwn(TAB_KEY_HANDLERS, event.key)) return;

  const handled = TAB_KEY_HANDLERS[event.key]({
    tabs,
    index,
    select: () => onSelect(id),
    close: () => {
      const at = items.findIndex((item) => item.id === id);
      pendingFocus.current = { closing: id, next: items[at + 1]?.id ?? items[at - 1]?.id ?? null };
      onClose(id);
    },
  });
  if (handled === false) return;
  event.preventDefault();
}
