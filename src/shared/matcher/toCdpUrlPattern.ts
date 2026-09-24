import type { UrlMatcher } from '../types';
import { CDP_PATTERN_BUILDERS } from './cdpPatternBuilders';
import { CDP_WILDCARD } from './constants';
import { stripQuery } from './stripQuery';

/**
 * Converts a matcher into a CDP `Fetch.RequestPattern.urlPattern`.
 * The result may match more URLs than the matcher (it is only a pre-filter
 * that decides which requests get paused); the matcher makes the final call.
 */
export function toCdpUrlPattern(matcher: UrlMatcher): string {
  const base = matcher.ignoreQuery ? stripQuery(matcher.pattern) : matcher.pattern;
  const suffix = matcher.ignoreQuery ? CDP_WILDCARD : '';
  return CDP_PATTERN_BUILDERS[matcher.type](base, suffix);
}
