import type { CreateRuleInput } from '@common/types';
import { SAVED_ROW_KEY_PREFIX } from './constants';

/** Keys for the header rows of an unedited rule: by index, which holds until the first edit (the list is static until then). */
export function initialRowKeys(input: CreateRuleInput): string[] {
  return ('headers' in input ? input.headers : []).map((_, i) => `${SAVED_ROW_KEY_PREFIX}${i}`);
}
