import { TRANSPARENT } from './constants';
import type { AnyNode } from './types';

/** The expression inside type assertions and parentheses (`useRef(null) as Ref` → the call). */
export function unwrapNode(node: AnyNode | null | undefined): AnyNode | null {
  return node && TRANSPARENT.has(node.type) ? unwrapNode(node.expression as AnyNode) : (node ?? null);
}
