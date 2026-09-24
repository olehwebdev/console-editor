import { useEffect, useReducer } from 'react';
import type { ResourceEntry } from '@common/types';
import { selectUniqueResources, useResourceStore } from '@/entities/resource';

/** A loading page adds files every frame, and each new list re-ranks the whole palette. */
export const FILES_REFRESH_MS = 300;
const NONE: readonly ResourceEntry[] = [];

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

/** The page's files while the palette is open, catching up with new ones at most every FILES_REFRESH_MS. */
export function usePageFiles(open: boolean): readonly ResourceEntry[] {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const files = open ? selectUniqueResources(useResourceStore.getState()) : NONE;
  useEffect(() => (open ? watchPageFiles(files, refresh) : undefined), [open, files]);
  return files;
}
