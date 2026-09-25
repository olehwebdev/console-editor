import type { FailReason } from '@common/types';
import { resumeHeld } from './resumeHeld';

/** Fail: the page sees the network error `reason` instead of a response. */
export function failHeldRequest(heldId: string, reason: FailReason): Promise<boolean> {
  return resumeHeld(heldId, { type: 'fail', reason });
}
