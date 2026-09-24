import type { UrlMatcher } from '../types';
import { globToRegExp } from './globToRegExp';
import type { UrlPredicate } from './types';

export function compileGlob(matcher: UrlMatcher, normalize: (url: string) => string): UrlPredicate {
  const re = globToRegExp(normalize(matcher.pattern));
  return (url) => re.test(normalize(url));
}
