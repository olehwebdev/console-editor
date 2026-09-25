import { mergeSchemas } from './mergeSchemas';
import type { InferredSchema } from './types';

/** Longer strings aren't offered as an example: they'd fill the suggestion list. */
const MAX_EXAMPLE_CHARS = 120;

/** How deep the schema follows nested values: past this, anything goes. */
const MAX_DEPTH = 32;

/**
 * A JSON Schema of the keys and types a live response has, for the editor to suggest keys and warn
 * about a value of another type. Every item of an array adds to its items' schema, nothing is
 * required, and other keys are allowed: a response being edited may add or drop fields on purpose.
 */
export function inferJsonSchema(value: unknown, depth = 0): InferredSchema {
  if (value === null || depth > MAX_DEPTH) return {};
  if (Array.isArray(value)) {
    const items = value.reduce<InferredSchema | undefined>((merged, item) => {
      const schema = inferJsonSchema(item, depth + 1);
      return merged ? mergeSchemas(merged, schema) : schema;
    }, undefined);
    return items ? { type: 'array', items } : { type: 'array' };
  }
  if (typeof value === 'object') {
    const properties: Record<string, InferredSchema> = {};
    for (const [key, child] of Object.entries(value)) properties[key] = inferJsonSchema(child, depth + 1);
    return { type: 'object', properties };
  }
  const type = typeof value;
  if (type !== 'string' && type !== 'number' && type !== 'boolean') return {};
  const example = type !== 'string' || (value as string).length <= MAX_EXAMPLE_CHARS;
  return { type, ...(example ? { examples: [value] } : {}) };
}
