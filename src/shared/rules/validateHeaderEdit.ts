import type { HeaderEdit } from '../types';
import { HEADER_NAME, MAX_HEADER_NAME_CHARS, PROTECTED_HEADERS } from './constants';
import { HEADER_VALUE_CHECKS } from './headerValueChecks';
import { isHeaderOperation } from './isHeaderOperation';

/** A header change's problem, or null. */
export function validateHeaderEdit(edit: HeaderEdit): string | null {
  if (!isHeaderOperation(edit.operation)) return 'Unknown header operation';
  if (!edit.name) return 'Enter a header name';
  if (edit.name.length > MAX_HEADER_NAME_CHARS) return `Header names are at most ${MAX_HEADER_NAME_CHARS} characters`;
  if (!HEADER_NAME.test(edit.name)) return "Header names can't contain spaces or ':'";
  const lower = edit.name.toLowerCase();
  if (Object.hasOwn(PROTECTED_HEADERS, lower)) return PROTECTED_HEADERS[lower];
  return HEADER_VALUE_CHECKS[edit.operation](edit.value);
}
