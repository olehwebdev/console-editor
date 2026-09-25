import type { JsonKind, JsonNode } from '@common/json';
import type { JsonChild } from './types';

/** The values each kind holds, with their keys (objects) or indices (arrays). */
export const TREE_CHILDREN: { [K in JsonKind]: (node: Extract<JsonNode, { kind: K }>) => JsonChild[] } = {
  object: (node) => node.entries.map((entry) => ({ key: entry.key, entry, value: entry.value })),
  array: (node) => node.items.map((value, i) => ({ key: i, value })),
  null: () => [],
  boolean: () => [],
  number: () => [],
  string: () => [],
};

/** What an emptied object or array is written as. */
export const EMPTY_CONTAINER: Partial<Record<JsonKind, string>> = { object: '{}', array: '[]' };

/** The key a new member gets, numbered when it is taken. */
export const NEW_KEY = 'key';
