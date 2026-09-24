import type { UrlMatcher } from '../types';
import type { UrlPredicate } from './types';

export function compileExact(matcher: UrlMatcher, normalize: (url: string) => string): UrlPredicate {
  const target = normalize(matcher.pattern);
  return (url) => normalize(url) === target;
}
