import { isHeaderOperation, MAX_HEADER_EDITS } from '../../shared/rules';
import type { HeaderEdit } from '../../shared/types';
import { isRecord } from './isRecord';

/** Well-formed header edits (at most MAX_HEADER_EDITS) as fresh copies, or null. */
export function sanitizeHeaderEdits(input: unknown): HeaderEdit[] | null {
  if (!Array.isArray(input) || input.length > MAX_HEADER_EDITS) return null;
  const edits: HeaderEdit[] = [];
  for (const edit of input) {
    if (!isRecord(edit) || !isHeaderOperation(edit.operation) || typeof edit.name !== 'string' || typeof edit.value !== 'string') return null;
    edits.push({ operation: edit.operation, name: edit.name, value: edit.value });
  }
  return edits;
}
