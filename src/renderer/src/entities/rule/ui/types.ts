import type { HeaderEdit } from '@common/types';

export interface HeaderEditRowProps {
  edit: HeaderEdit;
  /** The id of the datalist of common header names (`HeaderNameList`). */
  listId: string;
  /** The row was just added: its name field takes focus. */
  autoFocus: boolean;
  onChange(next: HeaderEdit): void;
  onRemove(): void;
}

/** What a header operation shows in the editor. */
export interface HeaderOperationField {
  label: string;
  /** Whether it takes a value (the value field is disabled, and emptied, otherwise). */
  takesValue: boolean;
}
