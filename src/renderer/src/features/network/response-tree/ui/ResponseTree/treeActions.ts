import type { TextEdit } from '@common/json';
import { appendChild, EMPTY_CONTAINER, removeChild, treeChildId } from '@/shared/lib';
import { editTabText } from '@/entities/editor-tab';
import { useResponseViews } from '../../model';
import { idAfterRemoval } from './idAfterRemoval';
import { parentId } from './parentId';
import type { EditPart, TreeActions } from './types';

// Actions never change, so they are read once instead of subscribed to.
const { setOpen } = useResponseViews.getState();

export interface TreeActionsInput {
  tabId: string;
  /** The tab's text the rows were read from: offsets point into it. */
  text: string;
  open: readonly string[];
  setSelected(id: string): void;
  setEditing(editing: { id: string; part: EditPart } | null): void;
}

/** The tree's actions over one version of the tab's text: each edit changes only the text it must, as one undoable edit. */
export function treeActions({ tabId, text, open, setSelected, setEditing }: TreeActionsInput): TreeActions {
  const edit = (edits: TextEdit[]) => editTabText(tabId, edits);
  const openIt = (id: string) => !open.includes(id) && setOpen(tabId, [...open, id]);
  return {
    select: setSelected,
    toggle: (row) => setOpen(tabId, open.includes(row.id) ? open.filter((id) => id !== row.id) : [...open, row.id]),
    startEdit: (row, part) => {
      setSelected(row.id);
      setEditing({ id: row.id, part });
    },
    cancelEdit: () => setEditing(null),
    commit: (row, part, typed) => {
      setEditing(null);
      if (part === 'value') edit([{ start: row.node.start, end: row.node.end, text: typed.trim() }]);
      else if (row.entry && typed !== row.entry.key) {
        edit([{ start: row.entry.keyStart, end: row.entry.keyEnd, text: JSON.stringify(typed) }]);
        // Renamed, it is another row: still the selected one.
        setSelected(treeChildId(parentId(row.id) ?? '', typed));
      }
    },
    setNull: (row) => edit([{ start: row.node.start, end: row.node.end, text: 'null' }]),
    empty: (row) => edit([{ start: row.node.start, end: row.node.end, text: EMPTY_CONTAINER[row.node.kind] ?? '' }]),
    add: (row) => {
      edit(appendChild(text, row.node));
      openIt(row.id);
    },
    remove: (row) => {
      if (!row.parent || row.index === undefined) return;
      edit(removeChild(row.parent, row.index));
      setSelected(idAfterRemoval(row));
    },
  };
}
