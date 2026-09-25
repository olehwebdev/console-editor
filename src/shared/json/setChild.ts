import type { JsonNode } from './types';

/**
 * Sets (or with undefined, removes) an object's member, in place: duplicates of the key go, and a new
 * member goes last. Arrays are only replaced whole or item by item, never grown or shrunk here. False
 * when `node` can't hold `key`.
 */
export function setChild(node: JsonNode, key: string | number, value: JsonNode | undefined): boolean {
  if (node.kind === 'array' && typeof key === 'number' && value && key < node.items.length) {
    node.items[key] = value;
    return true;
  }
  if (node.kind !== 'object' || typeof key !== 'string') return false;
  const at = node.entries.findIndex((e) => e.key === key);
  node.entries = node.entries.filter((e, i) => e.key !== key || (value !== undefined && i === at));
  if (!value) return true;
  const kept = node.entries.find((e) => e.key === key);
  if (kept) kept.value = value;
  else node.entries.push({ key, keyStart: -1, keyEnd: -1, value });
  return true;
}
