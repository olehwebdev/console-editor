import { lastEntries } from './lastEntries';
import { sameScalar } from './sameScalar';
import type { JsonEdit, JsonNode, JsonPath } from './types';

/**
 * The edits that turn `base` into `edited`, to apply to another document shaped like `base` (a newer
 * live response). Objects are compared member by member, so members nobody touched stay live. An array
 * of the same length is compared item by item; one whose length changed is replaced whole, since items
 * can't be told apart by position once some come or go (emptying a list keeps it empty).
 */
export function diffJson(base: JsonNode, edited: JsonNode, path: JsonPath = []): JsonEdit[] {
  if (base.kind === 'object' && edited.kind === 'object') {
    const before = lastEntries(base.entries);
    const after = lastEntries(edited.entries);
    const edits: JsonEdit[] = [];
    for (const [key, entry] of before) {
      const next = after.get(key);
      if (next) edits.push(...diffJson(entry.value, next.value, [...path, key]));
      else edits.push({ op: 'remove', path: [...path, key] });
    }
    for (const [key, entry] of after) if (!before.has(key)) edits.push({ op: 'add', path: [...path, key], value: entry.value });
    return edits;
  }
  if (base.kind === 'array' && edited.kind === 'array') {
    if (base.items.length !== edited.items.length) return [{ op: 'replace', path, value: edited }];
    return base.items.flatMap((item, i) => diffJson(item, edited.items[i]!, [...path, i]));
  }
  // Two objects or two arrays were compared above: what is left holds no other values, or changed kind.
  return sameScalar(base, edited) ? [] : [{ op: 'replace', path, value: edited }];
}
