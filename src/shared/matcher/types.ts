import type { UrlMatcher } from '../types';

export type UrlPredicate = (url: string) => boolean;

/** Builds a match type's predicate; `normalize` drops the query string when the matcher ignores it. */
export type MatcherCompiler = (matcher: UrlMatcher, normalize: (url: string) => string) => UrlPredicate;

/** Turns a pattern (without its query string when that is ignored) into a CDP url pattern; `suffix` lets any query follow. */
export type CdpPatternBuilder = (base: string, suffix: string) => string;
