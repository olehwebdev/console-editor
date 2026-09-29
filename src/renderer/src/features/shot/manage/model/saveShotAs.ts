import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { pathFileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';

/** Saves a copy of a shot's file where the user picks. */
export async function saveShotAs(shot: Pick<Shot, 'id' | 'name'>): Promise<void> {
  try {
    const path = await api.saveShotAs(shot.id);
    if (path) toast({ title: `Saved ${pathFileName(path)}`, tone: 'success' });
  } catch (err) {
    toast({ title: `Could not save ${shot.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
