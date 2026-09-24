import type { UpdateState } from '@common/types';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { UPDATE_TOAST_ID } from './constants';
import { downloadUpdate } from './downloadUpdate';
import { reason } from './reason';
import type { UpdateStateOf } from './types';

/**
 * A failed download, or an install that didn't happen (e.g. the password was refused). A failed check
 * is reported by the Check for Updates command that asked for it, or not at all.
 */
export function warnUpdateFailed(state: UpdateStateOf<'error'>, prev: UpdateState): void {
  if (state.update && state.during !== 'check' && prev.status !== 'error') {
    toast({
      id: UPDATE_TOAST_ID,
      title: state.during === 'install' ? "Couldn't install the update" : "Couldn't download the update",
      description: reason(state.message),
      tone: 'danger',
      action: { label: 'Try again', onClick: downloadUpdate },
      duration: TOAST_DURATION.pending,
    });
  }
}
