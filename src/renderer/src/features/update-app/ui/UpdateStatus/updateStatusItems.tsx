import { downloadingItem } from './downloadingItem';
import { offeredItem } from './offeredItem';
import { readyItem } from './readyItem';
import type { UpdateStatusItems } from './types';

/**
 * The status-bar entry in each state: there is one only while an update is on offer.
 * The items are called, not rendered as components: each is the same `<button>`, so React
 * keeps one node, and its focus, as the update moves from offered to downloading to ready.
 * Annotated rather than `satisfies`: `UpdateStatusItem`'s generic lookup needs the mapped type.
 */
export const UPDATE_STATUS_ITEMS: UpdateStatusItems = {
  available: (state) => offeredItem(state.update.version),
  // Still on offer after a failed download or install, when there was one.
  error: (state) => (state.update ? offeredItem(state.update.version) : null),
  downloading: (state) => downloadingItem(state.percent),
  ready: (state) => readyItem(state.update),
  disabled: () => null,
  idle: () => null,
  checking: () => null,
  'up-to-date': () => null,
};
