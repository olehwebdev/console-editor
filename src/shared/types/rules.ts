import type { UrlMatcher } from './overrides';

/**
 * What a rule does to the requests it matches.
 * - block:   fails the request before it is sent, like an ad blocker (net::ERR_BLOCKED_BY_CLIENT)
 * - headers: changes the response's headers
 * - cors:    lets the page read the response cross-origin: allows the requesting origin with
 *            credentials, exposes the headers, and answers its preflight with a success
 */
export const RULE_ACTIONS = ['block', 'headers', 'cors'] as const;

export type RuleAction = (typeof RULE_ACTIONS)[number];

/**
 * Request types a rule can be limited to, named as CDP's Fetch domain reports them. `XHR` is fetch(),
 * XMLHttpRequest and their CORS preflights (also EventSource and <link rel=prefetch>); `Ping` is
 * sendBeacon; `Other` the rest. `Document` covers iframes' pages; the top-level page is never blocked.
 */
export const RULE_RESOURCE_TYPES = ['Document', 'Stylesheet', 'Script', 'Image', 'Font', 'Media', 'XHR', 'Ping', 'Other'] as const;

export type RuleResourceType = (typeof RULE_RESOURCE_TYPES)[number];

/** How a header rule changes a header. */
export const HEADER_OPERATIONS = ['set', 'remove'] as const;

export type HeaderOperation = (typeof HEADER_OPERATIONS)[number];

/** One change to a response's headers. Names match in any case; `set` writes the name as given. */
export interface HeaderEdit {
  operation: HeaderOperation;
  name: string;
  /** What `set` writes; '' for `remove`. */
  value: string;
}

/** What every rule has, whatever it does. */
export interface RuleBase {
  /** 8 hex characters. */
  id: string;
  match: UrlMatcher;
  /** Limits it to these request types; empty = every type. */
  resourceTypes: RuleResourceType[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BlockRule extends RuleBase {
  action: 'block';
}

export interface HeaderRule extends RuleBase {
  action: 'headers';
  /** Applied in order, 1..MAX_HEADER_EDITS. */
  headers: HeaderEdit[];
}

export interface CorsRule extends RuleBase {
  action: 'cors';
}

/** A workspace's way of blocking requests or changing their responses' headers (SPEC §6.3). */
export type Rule = BlockRule | HeaderRule | CorsRule;

export type RuleOf<A extends RuleAction> = Extract<Rule, { action: A }>;

/** A rule's own state: set by the store. */
type RuleStateKey = 'id' | 'enabled' | 'createdAt' | 'updatedAt';

/** Distributes over the union so each action keeps its own fields. */
type WithoutRuleState<R> = R extends Rule ? Omit<R, RuleStateKey> : never;

/** What creating a rule takes. Rules start enabled, in the active workspace. */
export type CreateRuleInput = WithoutRuleState<Rule>;

/** What editing a rule may change. Its action is fixed; `headers` applies to header rules only. */
export interface RulePatch {
  match?: UrlMatcher;
  resourceTypes?: RuleResourceType[];
  enabled?: boolean;
  headers?: HeaderEdit[];
}
