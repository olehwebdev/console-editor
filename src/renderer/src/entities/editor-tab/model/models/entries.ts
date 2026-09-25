import type { monaco } from '@/shared/monaco';

interface Entry {
  model: monaco.editor.ITextModel;
  savedVersionId: number;
  /** Text editing started from (diff base); fetched lazily for overrides. */
  base?: string;
  /** Keeps the tab's dirty flag in step; read-only originals have none. */
  disposeListener?: monaco.IDisposable;
}

/** Monaco models per tab id. Kept out of the store because they aren't serializable. */
export const entries = new Map<string, Entry>();
