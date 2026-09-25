import { PROTECTED_HEADERS } from '../../../shared/rules';
import type { HeaderEdit } from '../../../shared/types';
import type { HeaderEntry } from '../transform';
import { HEADER_OPERATION_APPLIERS } from './headerOperationAppliers';

/**
 * Applies a header rule's edits in order. Operations this build doesn't know,
 * and protected headers (validation refuses them first), are skipped. The list
 * given is never mutated.
 */
export function applyHeaderEdits(headers: HeaderEntry[], edits: readonly HeaderEdit[]): HeaderEntry[] {
  return edits.reduce((current, edit) => {
    if (!Object.hasOwn(HEADER_OPERATION_APPLIERS, edit.operation) || Object.hasOwn(PROTECTED_HEADERS, edit.name.toLowerCase())) return current;
    return HEADER_OPERATION_APPLIERS[edit.operation](current, edit);
  }, headers);
}
