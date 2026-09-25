import type { Ref } from 'react';
import type { HeaderEdit } from '@common/types';

export interface HeaderEditRowProps {
  edit: HeaderEdit;
  /** The id of the datalist of common header names (`HeaderNameList`). */
  listId: string;
  /** The row was just added: its name field takes focus. */
  autoFocus?: boolean;
  onChange(next: HeaderEdit): void;
  onRemove(): void;
  /** What is wrong with the name or the value, from a form that checks them: shown under the row. */
  errors?: { name?: string; value?: string };
  /** The name and value fields, for a form that focuses one (a row added, the first one wrong). */
  nameRef?: Ref<HTMLInputElement>;
  valueRef?: Ref<HTMLInputElement>;
}

/** What a header operation shows in the editor. */
export interface HeaderOperationField {
  label: string;
  /** Whether it takes a value (the value field is disabled, and emptied, otherwise). */
  takesValue: boolean;
}
