import { applyJsonEdit } from './applyJsonEdit';
import type { JsonEdit, JsonNode } from './types';

/**
 * Applies edits to `root` (changed in place) in order. Null when one doesn't fit it (a member to
 * remove or replace that isn't there, a path through a value of another kind): the caller then serves
 * what it saved instead of half an edit.
 */
export function applyJsonEdits(root: JsonNode, edits: readonly JsonEdit[]): JsonNode | null {
  let current: JsonNode | null = root;
  for (const edit of edits) {
    current = applyJsonEdit(current, edit);
    if (!current) return null;
  }
  return current;
}
