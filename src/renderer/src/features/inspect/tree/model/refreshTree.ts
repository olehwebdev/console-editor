import type { ComponentTreeLevel } from '@common/types';
import { keyPath, useTreeStore } from '@/entities/inspector';
import { loadLevel } from './loadLevel';

/** Reads the tree again as far as it is open: the page may have rendered other components since. Returns the levels read. */
export async function refreshTree(): Promise<ComponentTreeLevel[]> {
  const { expanded } = useTreeStore.getState();
  const keys = ['', ...Object.keys(expanded).filter((key) => expanded[key])];
  const levels = await Promise.all(keys.map((key) => loadLevel(keyPath(key))));
  return levels.filter((level): level is ComponentTreeLevel => !!level);
}
