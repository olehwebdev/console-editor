// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { KEY } from '@/shared/config';
import { clickRow } from './clickRow';
import { focusRow } from './focusRow';
import { levelOf } from './levelOf';
import type { TreeRowKeyHandler } from './types';

/** The WAI-ARIA tree keys on a focused row; any other key is left alone. */
export const TREE_ROW_KEY_HANDLERS: Record<string, TreeRowKeyHandler> = {
  [KEY.arrowDown]: ({ row }) => focusRow(row, (rows, i) => rows[i + 1]),
  [KEY.arrowUp]: ({ row }) => focusRow(row, (rows, i) => rows[i - 1]),
  [KEY.home]: ({ row }) => focusRow(row, (rows) => rows[0]),
  [KEY.end]: ({ row }) => focusRow(row, (rows) => rows[rows.length - 1]),
  [KEY.arrowRight]: ({ row, expanded, onToggle }) => {
    // A leaf has nothing to expand or step into.
    if (expanded === undefined) return false;
    if (expanded) focusRow(row, (rows, i) => (rows[i + 1] && levelOf(rows[i + 1]) > levelOf(row) ? rows[i + 1] : undefined));
    else onToggle?.();
  },
  [KEY.arrowLeft]: ({ row, expanded, onToggle }) => {
    if (expanded === true && onToggle) onToggle();
    else
      focusRow(row, (rows, i) => {
        const level = levelOf(row);
        for (let j = i - 1; j >= 0; j--) if (levelOf(rows[j]) < level) return rows[j];
        return undefined;
      });
  },
  [KEY.enter]: clickRow,
  [KEY.space]: clickRow,
};
