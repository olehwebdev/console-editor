import type { UpdateState } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useUpdateStore } from '@/entities/app-update';
import { announcement } from './announcement';
import { UPDATE_TOAST_ID } from './constants';
import { reportCheckResult } from './reportCheckResult';

/** Help › Check for Updates: checks now and says what came of it (an update found raises its own toast). */
export async function checkForUpdatesNow(): Promise<void> {
  announcement.version = null;
  let state: UpdateState;
  try {
    state = await api.checkForUpdates();
  } catch (err) {
    toast({ id: UPDATE_TOAST_ID, title: "Couldn't check for updates", description: errorMessage(err), tone: 'danger' });
    return;
  }
  useUpdateStore.getState().setState(state);
  reportCheckResult(state);
}
