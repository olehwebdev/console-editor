import type { JsonTreeRow } from '@/shared/lib';

/** What can be edited in place: a member's key, or a value. */
export type EditPart = 'key' | 'value';

/** What the tree's rows and keys can do; each edit is one undoable change to the tab's text. */
export interface TreeActions {
  select(id: string): void;
  toggle(row: JsonTreeRow): void;
  startEdit(row: JsonTreeRow, part: EditPart): void;
  cancelEdit(): void;
  /** Writes a value as JSON text, or a key. */
  commit(row: JsonTreeRow, part: EditPart, text: string): void;
  setNull(row: JsonTreeRow): void;
  empty(row: JsonTreeRow): void;
  add(row: JsonTreeRow): void;
  remove(row: JsonTreeRow): void;
}
