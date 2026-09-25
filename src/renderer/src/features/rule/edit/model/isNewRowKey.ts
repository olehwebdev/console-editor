import { NEW_ROW_KEY_PREFIX } from './constants';

/** Whether a header row was added in the editor (rather than there from the start): its name field takes focus as it appears. */
export function isNewRowKey(key: string): boolean {
  return key.startsWith(NEW_ROW_KEY_PREFIX);
}
