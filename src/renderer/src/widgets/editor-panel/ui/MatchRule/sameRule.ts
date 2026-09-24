import type { UrlMatcher } from '@common/types';

export const sameRule = (a: UrlMatcher, b: UrlMatcher) => a.type === b.type && a.pattern === b.pattern && a.ignoreQuery === b.ignoreQuery;
