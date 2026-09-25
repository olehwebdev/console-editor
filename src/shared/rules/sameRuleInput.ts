import { sameMatcher } from '../matcher';
import type { CreateRuleInput } from '../types';

/** Whether two rules would do the same: action, matcher, request types and header changes, in order. */
export function sameRuleInput(a: CreateRuleInput, b: CreateRuleInput): boolean {
  if (a.action !== b.action || !sameMatcher(a.match, b.match)) return false;
  if (a.resourceTypes.length !== b.resourceTypes.length || a.resourceTypes.some((type, i) => type !== b.resourceTypes[i])) return false;
  const aHeaders = 'headers' in a ? a.headers : [];
  const bHeaders = 'headers' in b ? b.headers : [];
  return (
    aHeaders.length === bHeaders.length &&
    aHeaders.every((edit, i) => edit.operation === bHeaders[i].operation && edit.name === bHeaders[i].name && edit.value === bHeaders[i].value)
  );
}
