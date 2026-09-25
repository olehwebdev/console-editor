import { NEW_ROW_KEY_PREFIX } from './constants';
import { rowKeyCounter } from './rowKeyCounter';

/** A key for a header row being added. */
export function nextRowKey(): string {
  return `${NEW_ROW_KEY_PREFIX}${rowKeyCounter.next++}`;
}
