import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Lays a design (or capture) over the page; its bar shows under the preview's toolbar. */
export async function showOverlay(shot: Pick<Shot, 'id' | 'name'>): Promise<void> {
  try {
    await api.showOverlay(shot.id);
  } catch (err) {
    toast({ title: `Could not lay ${shot.name} over the page`, description: errorMessage(err), tone: 'danger' });
  }
}
