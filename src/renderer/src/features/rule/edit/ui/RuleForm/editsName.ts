import type { CreateRuleInput } from '@common/types';

/** Whether a header rule changes one of these headers (lower-case names). */
export function editsName(value: CreateRuleInput, names: ReadonlySet<string>): boolean {
  return 'headers' in value && value.headers.some((edit) => names.has(edit.name.trim().toLowerCase()));
}
