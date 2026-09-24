import { KEY } from '@/shared/config';
import type { TreeKeyTargetHandler } from './types';

/** Where each tree key moves focus; any other key doesn't. */
export const TREE_KEY_TARGETS: Record<string, TreeKeyTargetHandler> = {
  [KEY.arrowDown]: ({ index, last }) => (index < last ? index + 1 : null),
  [KEY.arrowUp]: ({ index }) => (index > 0 ? index - 1 : null),
  [KEY.home]: () => 0,
  [KEY.end]: ({ last }) => last,
  [KEY.pageDown]: ({ index, last, pageSize }) => Math.min(last, index + pageSize),
  [KEY.pageUp]: ({ index, pageSize }) => Math.max(0, index - pageSize),
  [KEY.arrowRight]: ({ rows, index, row }) =>
    row.expanded === true && rows[index + 1] && rows[index + 1].depth > row.depth ? index + 1 : null,
  [KEY.arrowLeft]: ({ rows, index, row }) => {
    if (row.expanded === true) return null;
    for (let i = index - 1; i >= 0; i--) if (rows[i].depth < row.depth) return i;
    return null;
  },
};
