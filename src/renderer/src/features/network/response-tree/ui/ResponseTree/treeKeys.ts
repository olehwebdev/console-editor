import { KEY } from '@/shared/config';
import type { JsonTreeRow } from '@/shared/lib';
import { holdsValues } from './holdsValues';
import { parentId } from './parentId';
import type { TreeActions } from './types';

/** What a key in the tree works on: the rows, the selected one's place (-1: none), and moving the selection. */
export interface TreeKeyContext {
  rows: readonly JsonTreeRow[];
  at: number;
  move(index: number): void;
  actions: TreeActions;
}

/** The tree's keys, as a tree view takes them (WAI-ARIA): arrows move, open and close; Enter edits or toggles, F2 renames, Delete removes. */
export const TREE_KEYS: Readonly<Record<string, (ctx: TreeKeyContext) => void>> = {
  [KEY.arrowDown]: ({ at, move }) => move(at + 1),
  [KEY.arrowUp]: ({ at, move }) => move(at < 0 ? 0 : at - 1),
  [KEY.home]: ({ move }) => move(0),
  [KEY.end]: ({ rows, move }) => move(rows.length - 1),
  [KEY.arrowRight]: ({ rows, at, move, actions }) => {
    const row = rows[at];
    if (!row || !holdsValues(row)) return;
    if (row.open) move(at + 1);
    else actions.toggle(row);
  },
  [KEY.arrowLeft]: ({ rows, at, move, actions }) => {
    const row = rows[at];
    if (!row) return;
    if (holdsValues(row) && row.open) return actions.toggle(row);
    const up = parentId(row.id);
    if (up !== undefined) move(rows.findIndex((r) => r.id === up));
  },
  [KEY.enter]: ({ rows, at, actions }) => {
    const row = rows[at];
    if (!row) return;
    if (holdsValues(row)) actions.toggle(row);
    else actions.startEdit(row, 'value');
  },
  [KEY.f2]: ({ rows, at, actions }) => {
    const row = rows[at];
    if (row?.entry) actions.startEdit(row, 'key');
  },
  [KEY.delete]: ({ rows, at, actions }) => rows[at] && actions.remove(rows[at]),
  [KEY.backspace]: ({ rows, at, actions }) => rows[at] && actions.remove(rows[at]),
};
