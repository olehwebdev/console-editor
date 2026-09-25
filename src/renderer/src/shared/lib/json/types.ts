/** The part of JSON Schema the editor infers from a live response: types, keys and an example of each value. */
export interface InferredSchema {
  /** Unset where the samples disagree, or only ever held null: anything goes there. */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, InferredSchema>;
  items?: InferredSchema;
  /** One live value, offered when typing the key's value. */
  examples?: unknown[];
}
