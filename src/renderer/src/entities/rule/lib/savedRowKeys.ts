import type { HeaderEdit } from '@common/types';
import { SAVED_ROW_KEY_PREFIX } from './constants';

/** Keys for header rows as saved: by index, which holds until the first edit (the list is static until then). */
export function savedRowKeys(headers: readonly HeaderEdit[]): string[] {
  return headers.map((_, i) => `${SAVED_ROW_KEY_PREFIX}${i}`);
}
