import { MAX_HELD_BODY } from '../constants';

/** A body's problem, or null; an optional one may be left out. */
export function bodyProblem(body: unknown, optional: boolean): string | null {
  if (body === undefined && optional) return null;
  if (typeof body !== 'string') return 'The body is text';
  return body.length > MAX_HELD_BODY ? 'The body is too long' : null;
}
