import type { ComponentTreeLevel } from '@common/types';
import { pathKey, useTreeStore } from '@/entities/inspector';
import { loadLevel } from './loadLevel';

/** Opens a node (reading its components the first time) or closes it. Returns the levels read. */
export async function toggleNode(path: number[]): Promise<ComponentTreeLevel[]> {
  const { expanded, levels, setExpanded } = useTreeStore.getState();
  const key = pathKey(path);
  setExpanded(key, !expanded[key]);
  if (expanded[key] || key in levels) return [];
  const level = await loadLevel(path);
  return level ? [level] : [];
}
