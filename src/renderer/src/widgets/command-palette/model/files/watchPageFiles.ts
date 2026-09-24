import type { ResourceEntry } from '@common/types';
import { selectUniqueResources, useResourceStore } from '@/entities/resource';
import { FILES_REFRESH_MS } from './constants';

/**
 * Calls `onChange` once, FILES_REFRESH_MS after the page's files first differ
 * from `shown` (including before this call). Returns the unsubscribe.
 */
export function watchPageFiles(shown: readonly ResourceEntry[], onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    if (timer === undefined && selectUniqueResources(useResourceStore.getState()) !== shown) timer = setTimeout(onChange, FILES_REFRESH_MS);
  };
  check();
  const off = useResourceStore.subscribe(check);
  return () => {
    off();
    clearTimeout(timer);
  };
}
