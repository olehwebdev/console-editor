import type { Rule } from '@common/types';

/** A rule changed a request (blocked it, or changed its response's headers). */
export interface RuleHit {
  ruleId: string;
  url: string;
}

/** A URL a rule changed this session, and how often. */
export interface RecentRequest {
  url: string;
  count: number;
  /** When it last happened (ms since the epoch). */
  lastAt: number;
}

/** What the rules did this session; `recordHits` returns the next one. */
export interface RuleHitState {
  /** Times each rule applied this session (never reset, like override hits). */
  hits: Record<string, number>;
  /** Per rule, newest first, one per URL, at most MAX_RECENT_REQUESTS. */
  recent: Record<string, RecentRequest[]>;
}

export interface RuleStore extends RuleHitState {
  byId: Record<string, Rule>;

  /** Takes the active workspace's rules; hits and recent requests are kept. */
  setAll(rules: Rule[]): void;
  upsert(rule: Rule): void;
  /** Applies a frame's worth of hits in one update. */
  recordHits(hits: readonly RuleHit[]): void;
}
