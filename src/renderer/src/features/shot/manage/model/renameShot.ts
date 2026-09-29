import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** Renames a shot (the list and its page follow as `shots-changed`); resolves with whether it was renamed. */
export async function renameShot(shot: Pick<Shot, 'id' | 'name'>, name: string): Promise<boolean> {
  if (name.trim() === shot.name) return true;
  try {
    await api.renameShot(shot.id, name);
    return true;
  } catch (err) {
    toast({ title: `Could not rename ${shot.name}`, description: errorMessage(err), tone: 'danger' });
    return false;
  }
}
