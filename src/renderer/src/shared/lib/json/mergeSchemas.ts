import type { InferredSchema } from './types';

/**
 * The schema two samples share: an object's keys from both, an array's items merged, and no type
 * where they disagree. An empty schema (a null) takes the other's shape, so a field that was null in
 * one item and a string in another is a string.
 */
export function mergeSchemas(a: InferredSchema, b: InferredSchema): InferredSchema {
  if (!a.type) return b;
  if (!b.type) return a;
  if (a.type !== b.type) return {};
  const merged: InferredSchema = { ...a };
  if (a.properties && b.properties) {
    const properties: Record<string, InferredSchema> = { ...a.properties };
    for (const [key, schema] of Object.entries(b.properties)) {
      properties[key] = Object.hasOwn(properties, key) ? mergeSchemas(properties[key]!, schema) : schema;
    }
    merged.properties = properties;
  }
  if (a.items && b.items) merged.items = mergeSchemas(a.items, b.items);
  else if (b.items) merged.items = b.items;
  return merged;
}
