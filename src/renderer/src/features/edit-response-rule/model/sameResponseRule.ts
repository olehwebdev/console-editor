import type { ResponseRuleValue } from './types';

/** Whether two rules say the same thing (NaN, a field left empty, equals itself). */
export function sameResponseRule(a: ResponseRuleValue, b: ResponseRuleValue): boolean {
  const headers = a.response.headers;
  const other = b.response.headers;
  return (
    a.request.method === b.request.method &&
    a.request.operation === b.request.operation &&
    Object.is(a.response.status, b.response.status) &&
    Object.is(a.response.delayMs, b.response.delayMs) &&
    a.response.send === b.response.send &&
    a.response.patch === b.response.patch &&
    headers.length === other.length &&
    headers.every((edit, i) => edit.operation === other[i].operation && edit.name === other[i].name && edit.value === other[i].value)
  );
}
