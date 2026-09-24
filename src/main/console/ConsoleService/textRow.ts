import type { NewEntry, RowDraft } from './types';

/** A row whose one value is plain text. */
export function textRow(entry: NewEntry, text: string): RowDraft {
  return { entry, values: () => [{ kind: 'string', text }] };
}
