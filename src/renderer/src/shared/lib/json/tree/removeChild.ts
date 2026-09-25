import type { JsonNode, TextEdit } from '@common/json';
import { childSpan } from './childSpan';
import { EMPTY_CONTAINER } from './constants';

/** Removes a child of an object or array with the comma that went with it, as one edit. The last one leaves it empty. */
export function removeChild(parent: JsonNode, index: number): TextEdit[] {
  const span = childSpan(parent, index);
  if (!span) return [];
  const next = childSpan(parent, index + 1);
  if (next) return [{ start: span.from, end: next.from, text: '' }];
  const previous = childSpan(parent, index - 1);
  if (previous) return [{ start: previous.to, end: span.to, text: '' }];
  return [{ start: parent.start, end: parent.end, text: EMPTY_CONTAINER[parent.kind] ?? '' }];
}
