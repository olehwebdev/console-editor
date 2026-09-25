import { findChild } from './findChild';
import { setChild } from './setChild';
import type { JsonEdit, JsonNode } from './types';

/** Applies one edit to `root`, in place; the new root (a new value, for an edit of the root itself), or null when it doesn't fit. */
export function applyJsonEdit(root: JsonNode, edit: JsonEdit): JsonNode | null {
  if (!edit.path.length) return edit.op === 'remove' ? null : edit.value;
  let parent: JsonNode | undefined = root;
  for (const key of edit.path.slice(0, -1)) {
    parent = findChild(parent, key);
    if (!parent) return null;
  }
  const last = edit.path.at(-1)!;
  // Add sets a member whether or not it is there (RFC 6902); remove and replace need it there.
  if (edit.op !== 'add' && !findChild(parent, last)) return null;
  return setChild(parent, last, edit.op === 'remove' ? undefined : edit.value) ? root : null;
}
