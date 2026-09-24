import { useEffect, useReducer } from 'react';
import type { ResourceEntry } from '@common/types';
import { selectUniqueResources, useResourceStore } from '@/entities/resource';
import { watchPageFiles } from './watchPageFiles';

const NONE: readonly ResourceEntry[] = [];

/** The page's files while the palette is open, catching up with new ones at most every FILES_REFRESH_MS. */
export function usePageFiles(open: boolean): readonly ResourceEntry[] {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const files = open ? selectUniqueResources(useResourceStore.getState()) : NONE;
  useEffect(() => (open ? watchPageFiles(files, refresh) : undefined), [open, files]);
  return files;
}
