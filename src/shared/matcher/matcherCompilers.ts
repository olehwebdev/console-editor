import type { MatchType } from '../types';
import { compileExact } from './compileExact';
import { compileGlob } from './compileGlob';
import { compileRegex } from './compileRegex';
import type { MatcherCompiler } from './types';

/** How each match type tests a URL: a new MatchType fails typecheck until it has one. */
export const MATCHER_COMPILERS: Record<MatchType, MatcherCompiler> = {
  exact: compileExact,
  glob: compileGlob,
  regex: compileRegex,
};
