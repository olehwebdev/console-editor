import { validateMatcher } from '../../../shared/matcher';
import type { UrlMatcher } from '../../../shared/types';

/** Throws, with a readable message, when `match` can't be used. */
export function assertMatcher(match: UrlMatcher): void {
  const error = validateMatcher(match);
  if (error) throw new Error(error);
}
