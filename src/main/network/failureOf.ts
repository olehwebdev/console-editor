import { CANCELLED } from './constants';
import type { LoadingEnded } from './types';

/** Why a request failed, as its row says: cancelled (by the page, or a navigation), blocked, or the network error. */
export function failureOf(p: LoadingEnded): string {
  if (p.canceled) return CANCELLED;
  if (p.blockedReason) return `Blocked (${p.blockedReason})`;
  return p.errorText || 'Failed';
}
