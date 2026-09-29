import type { Override, Rule, Settings } from '../../../shared/types';
import type { MatcherCache } from '../InterceptionEngine';
import type { OverrideMatcher } from '../InterceptionEngine/OverrideMatcher';
import type { ResponseHead } from '../rules';

/** What answering a request reads each time: the active workspace's overrides and rules, and the settings. */
export interface AnswerSources {
  getOverrides(): Override[];
  getRules(): readonly Rule[];
  getSettings(): Settings;
}

/** What answering a request works with: the sources, and the matchers compiled from them. */
export interface AnswerContext {
  sources: AnswerSources;
  overrides: OverrideMatcher;
  matchers: MatcherCache;
}

/** What to do with a request before it is sent: fail it, answer it (after a delay) without sending it, or send it on. */
export type RequestDecision = { action: 'fail' } | { action: 'answer'; head: ResponseHead; body: string; delayMs: number } | { action: 'continue' };
