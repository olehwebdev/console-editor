import type { JsonEntry, JsonNode } from '@common/json';

/** One line of a JSON tree: a value, where it sits, and whether its children show. */
export interface JsonTreeRow {
  /** Its path from the root ('' for the root), unique in the tree: what keeps it open or selected. */
  id: string;
  depth: number;
  node: JsonNode;
  /** Its key in an object, or its index in an array; unset for the root. */
  key?: string | number;
  /** The object member it is the value of: where its key is written. */
  entry?: JsonEntry;
  /** The object or array it is in, and its place there. */
  parent?: JsonNode;
  index?: number;
  /** An object or array whose children show. */
  open: boolean;
}

/** A value held by an object or array, with its key or index. */
export interface JsonChild {
  key: string | number;
  entry?: JsonEntry;
  value: JsonNode;
}
