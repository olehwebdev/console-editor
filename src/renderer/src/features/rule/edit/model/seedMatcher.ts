import { defaultMatcherFor } from '@common/matcher';
import type { UrlMatcher } from '@common/types';
import { EMPTY_SEED_MATCHER } from './constants';

/** A new rule's matcher: the file's own URL, or an empty glob. */
export function seedMatcher(url?: string): UrlMatcher {
  return url ? defaultMatcherFor(url) : { ...EMPTY_SEED_MATCHER };
}
