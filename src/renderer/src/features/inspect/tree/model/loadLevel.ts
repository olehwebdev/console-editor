import type { ComponentTreeLevel } from '@common/types';
import { api } from '@/shared/api';
import { pathKey, useTreeStore } from '@/entities/inspector';

/** Reads a level of the shown frame's tree and keeps it; a level read for a frame no longer shown is dropped. */
export async function loadLevel(path: number[]): Promise<ComponentTreeLevel | null> {
  const { frameId } = useTreeStore.getState();
  if (!frameId) return null;
  const level = await api.componentTree(frameId, path).catch(() => null);
  if (useTreeStore.getState().frameId !== frameId) return null;
  useTreeStore.getState().setLevel(pathKey(path), level);
  return level;
}
