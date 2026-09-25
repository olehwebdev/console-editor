import type { monaco } from '@/shared/monaco';

interface Entry {
  model: monaco.editor.ITextModel;
  savedVersionId: number;
  /** Text editing started from (diff base); fetched lazily for overrides. */
  base?: string;
  /** Keeps the tab's dirty flag in step; read-only originals have none. */
  disposeListener?: monaco.IDisposable;
  /** The model's URI in the JSON service's schemas, when a response tab registered one: it goes with the tab. */
  schemaUri?: string;
}

/** Monaco models per tab id. Kept out of the store because they aren't serializable. */
export const entries = new Map<string, Entry>();
