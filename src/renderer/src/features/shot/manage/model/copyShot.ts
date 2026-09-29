import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';

/** Puts a shot's image on the clipboard. */
export async function copyShot(shot: Pick<Shot, 'id' | 'name'>): Promise<void> {
  try {
    await api.copyShot(shot.id);
    toast({ title: `Copied ${shot.name}`, tone: 'neutral', duration: TOAST_DURATION.confirm });
  } catch (err) {
    toast({ title: `Could not copy ${shot.name}`, description: errorMessage(err), tone: 'danger' });
  }
}
