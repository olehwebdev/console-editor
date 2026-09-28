import { MatcherCache } from '../InterceptionEngine';
import { OverrideMatcher } from '../InterceptionEngine/OverrideMatcher';
import type { AnswerContext, AnswerSources } from './types';

/** A context to answer requests from `sources` with, its matchers compiled as they are needed. */
export function answerContext(sources: AnswerSources): AnswerContext {
  return { sources, overrides: new OverrideMatcher({ getOverrides: () => sources.getOverrides() }), matchers: new MatcherCache() };
}
