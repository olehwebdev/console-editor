/** Where a value sits in the text it was parsed from: `start` inclusive, `end` exclusive. */
interface Span {
  start: number;
  end: number;
}

/**
 * A JSON value as parsed here. A number keeps its text, so a 64-bit id stays exact, and an object keeps
 * its keys in order (duplicates too), so what is written back reads as the server sent it.
 */
export type JsonNode =
  | (Span & { kind: 'null' })
  | (Span & { kind: 'boolean'; value: boolean })
  | (Span & { kind: 'number'; raw: string })
  | (Span & { kind: 'string'; value: string })
  | (Span & { kind: 'array'; items: JsonNode[] })
  | (Span & { kind: 'object'; entries: JsonEntry[] });

export type JsonKind = JsonNode['kind'];

/** One member of an object, with where its key is written. */
export interface JsonEntry {
  key: string;
  keyStart: number;
  keyEnd: number;
  value: JsonNode;
}

/** Where a value is: object keys and array indices from the root ([] is the root itself). */
export type JsonPath = Array<string | number>;

/**
 * A change from one JSON document to another, as a JSON Patch operation (RFC 6902) says it: `add` a
 * member, `remove` one, or `replace` a value. Applied in order.
 */
export type JsonEdit = { op: 'add'; path: JsonPath; value: JsonNode } | { op: 'remove'; path: JsonPath } | { op: 'replace'; path: JsonPath; value: JsonNode };

/** A change to a text: `[start, end)` becomes `text`. */
export interface TextEdit {
  start: number;
  end: number;
  text: string;
}
