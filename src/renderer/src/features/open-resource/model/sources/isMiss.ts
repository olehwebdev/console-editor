import type { Miss, MissReason } from '@/shared/lib';

/** Whether the worker couldn't answer (for `reason`, if given). */
export function isMiss(reply: unknown, reason?: MissReason): reply is Miss {
  return typeof reply === 'object' && reply !== null && 'miss' in reply && (reason === undefined || (reply as Miss).miss === reason);
}
