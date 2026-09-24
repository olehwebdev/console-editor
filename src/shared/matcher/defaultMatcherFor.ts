import type { UrlMatcher } from '../types';
import { stripQuery } from './stripQuery';

/** The default matcher for an override created from `url`. */
export function defaultMatcherFor(url: string): UrlMatcher {
  return { type: 'exact', pattern: stripQuery(url), ignoreQuery: true };
}
