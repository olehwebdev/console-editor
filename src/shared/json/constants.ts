import type { JsonKind, JsonNode } from './types';

/** The characters JSON counts as whitespace. */
export const JSON_WHITESPACE = new Set([' ', '\t', '\n', '\r']);

/** What each escape after a backslash in a JSON string stands for (`\u` is read on its own). */
export const JSON_ESCAPES: Readonly<Record<string, string>> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

/** A JSON number, from where it starts. */
export const JSON_NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/** The literals, by their first character. */
export const JSON_LITERALS: Readonly<Record<string, { text: string; kind: 'null' | 'boolean'; value?: boolean }>> = {
  n: { text: 'null', kind: 'null' },
  t: { text: 'true', kind: 'boolean', value: true },
  f: { text: 'false', kind: 'boolean', value: false },
};

/** Hex digits after `\u`. */
export const UNICODE_ESCAPE_LENGTH = 4;
export const HEX = 16;

/** How each value that holds no others is written. */
export const SCALAR_TEXT: { [K in Exclude<JsonKind, 'object' | 'array'>]: (node: Extract<JsonNode, { kind: K }>) => string } = {
  null: () => 'null',
  boolean: (node) => String(node.value),
  number: (node) => node.raw,
  string: (node) => JSON.stringify(node.value),
};
