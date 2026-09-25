import type { ComponentTreeLevel } from '@common/types';
import { useTreeStore } from '@/entities/inspector';
import { loadLevel } from './loadLevel';

/** Shows another frame's tree, from its top components. Returns the levels read. */
export async function chooseFrame(frameId: string): Promise<ComponentTreeLevel[]> {
  useTreeStore.getState().setFrame(frameId);
  const level = await loadLevel([]);
  return level ? [level] : [];
}
