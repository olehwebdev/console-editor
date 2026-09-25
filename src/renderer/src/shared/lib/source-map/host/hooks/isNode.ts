import type { AnyNode } from './types';

/** A syntax node, as opposed to the other values a node's keys hold. */
export function isNode(value: unknown): value is AnyNode {
  return !!value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}
