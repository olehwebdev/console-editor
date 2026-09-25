import type { HeldAction } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { closeHeldTab } from './closeHeldTab';
import { resuming } from './resuming';

/** Lets a held request go as `action` says, and closes its tab. False if it couldn't (it is said why). */
export async function resumeHeld(heldId: string, action: HeldAction): Promise<boolean> {
  resuming.add(heldId);
  try {
    await api.resumeHeldRequest(heldId, action);
    closeHeldTab(heldId);
    return true;
  } catch (err) {
    toast({ title: 'Could not let the request go', description: errorMessage(err), tone: 'danger' });
    return false;
  } finally {
    resuming.delete(heldId);
  }
}
