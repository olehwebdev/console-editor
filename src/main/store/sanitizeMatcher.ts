import { isMatchType } from '../../shared/rules';
import type { UrlMatcher } from '../../shared/types';
import { isRecord } from './isRecord';

/** A well-formed matcher as a fresh copy of its three fields, or null. */
export function sanitizeMatcher(input: unknown): UrlMatcher | null {
  if (!isRecord(input) || !isMatchType(input.type) || typeof input.pattern !== 'string' || typeof input.ignoreQuery !== 'boolean') return null;
  return { type: input.type, pattern: input.pattern, ignoreQuery: input.ignoreQuery };
}
