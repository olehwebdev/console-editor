import type { JsonNode, TextEdit } from '@common/json';
import { childSpan } from './childSpan';
import { uniqueKey } from './uniqueKey';

/**
 * Adds a null at the end of an object (under a key it doesn't have) or an array, written the way its
 * last child is: on its own line with the same indent when that one is, with the same space after the colon.
 */
export function appendChild(text: string, parent: JsonNode): TextEdit[] {
  if (parent.kind !== 'object' && parent.kind !== 'array') return [];
  const count = parent.kind === 'object' ? parent.entries.length : parent.items.length;
  const member = (colon: string) => (parent.kind === 'object' ? `${JSON.stringify(uniqueKey(parent))}${colon}null` : 'null');
  if (!count) return [{ start: parent.start, end: parent.end, text: parent.kind === 'object' ? `{ ${member(': ')} }` : '[null]' }];
  const last = childSpan(parent, count - 1)!;
  const before = count > 1 ? childSpan(parent, count - 2)!.to : parent.start + 1;
  // What comes between the last two children, after the comma: a newline and indent, a space, or nothing.
  const gap = text.slice(before, last.from);
  const separator = count > 1 ? gap.slice(gap.indexOf(',') + 1) : gap;
  const lastEntry = parent.kind === 'object' ? parent.entries.at(-1)! : undefined;
  const colon = lastEntry ? text.slice(lastEntry.keyEnd, lastEntry.value.start) : ': ';
  return [{ start: last.to, end: last.to, text: `,${separator}${member(colon)}` }];
}
