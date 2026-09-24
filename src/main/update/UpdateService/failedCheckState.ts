import type { UpdateState } from '../../../shared/types';
import { errorMessage } from './errorMessage';
import { pendingUpdate } from './pendingUpdate';

/** The state after a check failed: a manual check reports it, an automatic one keeps quiet. */
export function failedCheckState(before: UpdateState, manual: boolean, err: unknown): UpdateState {
  if (!manual) return before.status === 'checking' ? { status: 'idle' } : before;
  // An update found earlier stays on offer.
  const update = pendingUpdate(before);
  return { status: 'error', during: 'check', message: `Couldn't check for updates: ${errorMessage(err)}`, ...(update ? { update } : {}) };
}
