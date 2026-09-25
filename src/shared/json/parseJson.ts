import { JsonParser } from './JsonParser';
import type { JsonNode } from './types';

/** Parses JSON text into a tree that keeps numbers' text, key order and every value's offsets. Throws `JsonSyntaxError`. */
export function parseJson(text: string): JsonNode {
  return new JsonParser(text).parse();
}
