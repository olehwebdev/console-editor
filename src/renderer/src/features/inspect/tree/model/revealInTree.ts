import type { ComponentTreeLevel, InspectedComponent } from '@common/types';
import { pathKey, useTreeStore } from '@/entities/inspector';
import { loadLevel } from './loadLevel';

/** Shows a component in its frame's tree: every level down to it read again and opened, and it selected. Returns the levels read. */
export async function revealInTree(component: InspectedComponent): Promise<ComponentTreeLevel[]> {
  const { frameId, path } = component;
  if (!frameId || !path?.length) return [];
  if (useTreeStore.getState().frameId !== frameId) useTreeStore.getState().setFrame(frameId);
  const loaded: ComponentTreeLevel[] = [];
  for (let depth = 0; depth < path.length; depth++) {
    const prefix = path.slice(0, depth);
    if (depth) useTreeStore.getState().setExpanded(pathKey(prefix), true);
    const level = await loadLevel(prefix);
    if (level) loaded.push(level);
  }
  useTreeStore.getState().select(pathKey(path));
  return loaded;
}
