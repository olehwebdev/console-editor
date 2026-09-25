import { TIMEOUT_ERRORS } from './constants';

/** Whether a fetch failed because its time ran out (or it was aborted), rather than on the network. */
export function isTimeout(err: unknown): boolean {
  return err instanceof Error && TIMEOUT_ERRORS.has(err.name);
}
