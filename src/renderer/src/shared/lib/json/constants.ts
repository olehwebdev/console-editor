import type { JsonKind, JsonNode } from '@common/json';

/** What a lengthened text is padded with: words, so it wraps as real copy does. */
export const LONG_TEXT_FILLER =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ';

/** A lengthened text is at least this long, and at least this many times what it was. */
export const LONG_TEXT_MIN_LENGTH = 80;
export const LONG_TEXT_FACTOR = 3;

/**
 * Text that is a link, an id or a date keeps its length: lengthened, it would break the page's logic
 * (a route, a lookup, a parse) rather than its layout.
 */
export const KEEPS_LENGTH = /^(?:[a-z][a-z+.-]*:\/\/|\/|[0-9a-f]{8}-[0-9a-f]{4}-|\d{4}-\d{2}-\d{2}|[^\s@]+@[^\s@]+\.[a-z]+$)/i;

/** The values a JSON value holds, each with the span that counts as it (for an object's member: its key through its value). */
export const CHILD_SPANS: { [K in JsonKind]: (node: Extract<JsonNode, { kind: K }>) => Array<{ from: number; to: number; value: JsonNode }> } = {
  array: (node) => node.items.map((value) => ({ from: value.start, to: value.end, value })),
  object: (node) => node.entries.map((e) => ({ from: e.keyStart, to: e.value.end, value: e.value })),
  null: () => [],
  boolean: () => [],
  number: () => [],
  string: () => [],
};
