import { SKIPPED_KEYS } from './constants';
import { isNode } from './isNode';
import type { AnyNode } from './types';

/** A node's children that are code, in the order its keys list them. */
export function childNodes(node: AnyNode): AnyNode[] {
  const out: AnyNode[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Array.isArray(value)) out.push(...value.filter(isNode));
    else if (isNode(value)) out.push(value);
  }
  return out;
}
