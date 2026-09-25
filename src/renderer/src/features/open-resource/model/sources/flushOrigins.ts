import { useInspectorStore } from '@/entities/inspector';
import { ORIGIN_FLUSH_MS } from './constants';
import { originLookups } from './originLookups';

/**
 * Writes the originals found so far in one store update, `ORIGIN_FLUSH_MS` after the first of them (a
 * batch of renders or requests finds hundreds, which would each re-render what shows them). The promise
 * of that write, shared by everything waiting for it.
 */
export function flushOrigins(): Promise<void> {
  originLookups.written ??= new Promise((resolve) =>
    setTimeout(() => {
      const entries = [...originLookups.found];
      originLookups.found.clear();
      originLookups.written = null;
      for (const [key] of entries) originLookups.inFlight.delete(key);
      useInspectorStore.getState().setOrigins(entries);
      resolve();
    }, ORIGIN_FLUSH_MS),
  );
  return originLookups.written;
}
