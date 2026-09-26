import { urlMatcherSchema } from '../../../shared/matcher';
import type { UrlMatcher } from '../../../shared/types';
import { firstIssue } from '../../../shared/validation';

/** Throws, with a readable message, when `match` can't be used. */
export function assertMatcher(match: UrlMatcher): void {
  const error = firstIssue(urlMatcherSchema, match);
  if (error) throw new Error(error);
}
