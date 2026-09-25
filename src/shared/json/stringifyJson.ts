import { SCALAR_TEXT } from './constants';
import type { JsonNode } from './types';

/** Writes a tree back as compact JSON (as APIs send it): numbers as they were written, keys in their order. */
export function stringifyJson(node: JsonNode): string {
  if (node.kind === 'object') return `{${node.entries.map((e) => `${JSON.stringify(e.key)}:${stringifyJson(e.value)}`).join(',')}}`;
  if (node.kind === 'array') return `[${node.items.map(stringifyJson).join(',')}]`;
  return SCALAR_TEXT[node.kind](node as never);
}
