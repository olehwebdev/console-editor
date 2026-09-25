import type { CreateRuleInput } from '@common/types';
import { savedRowKeys } from '@/entities/rule';

/** Keys for the header rows of an unedited rule. */
export function initialRowKeys(input: CreateRuleInput): string[] {
  return savedRowKeys('headers' in input ? input.headers : []);
}
