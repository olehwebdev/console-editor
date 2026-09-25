import type { InspectedComponent } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useInspectorStore } from '@/entities/inspector';
import { showComponent } from './showComponent';

/**
 * Reads another component of the picked element's chain (0: the one that rendered it), or the same one again,
 * as it is now, and shows it. Null when it can't be read (the page moved on), after saying so.
 */
export async function inspectDepth(depth: number): Promise<InspectedComponent | null> {
  const current = useInspectorStore.getState().component;
  if (!current) return null;
  try {
    const component = await api.inspectComponent(current.pickId, depth);
    showComponent(component);
    return component;
  } catch (err) {
    toast({ title: "Couldn't read that component", description: errorMessage(err), tone: 'danger' });
    return null;
  }
}
