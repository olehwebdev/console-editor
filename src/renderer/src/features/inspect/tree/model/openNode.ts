import type { InspectedComponent } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { pathKey, useTreeStore } from '@/entities/inspector';

/** Picks a node of the tree, as if its first element were clicked; null when it can't be, after saying why. */
export async function openNode(path: number[]): Promise<InspectedComponent | null> {
  const { frameId, select } = useTreeStore.getState();
  if (!frameId) return null;
  try {
    const component = await api.openTreeNode(frameId, path);
    select(pathKey(path));
    return component;
  } catch (err) {
    toast({ title: "Couldn't open that component", description: errorMessage(err), tone: 'danger' });
    return null;
  }
}
