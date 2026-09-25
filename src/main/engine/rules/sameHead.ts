import type { ResponseHead } from './types';

/** Whether two response heads are the same: status, and every header in order, as spelled. */
export function sameHead(a: ResponseHead, b: ResponseHead): boolean {
  return (
    a.status === b.status &&
    a.headers.length === b.headers.length &&
    a.headers.every((h, i) => h.name === b.headers[i].name && h.value === b.headers[i].value)
  );
}
