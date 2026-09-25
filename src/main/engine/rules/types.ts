import type { HeaderEdit, HeaderOperation, Rule, RuleAction } from '../../../shared/types';
import type { RequestStage } from '../InterceptionEngine/types';
import type { HeaderEntry } from '../transform';
import type { RULE_ACTION_SPECS } from './constants';

/** A response's status and headers, as they will be sent on. */
export interface ResponseHead {
  status: number;
  headers: HeaderEntry[];
}

/** What rules read from the paused request. */
export interface PausedRequest {
  url: string;
  method: string;
  /** Request headers by lower-case name. */
  headers: Record<string, string>;
  /** URL of the frame that made the request, when this session knows it. */
  frameUrl?: string;
  /** Its body, when it had one as text (for a response override's GraphQL operation). */
  body?: string;
}

export interface RuleActionSpec {
  stage: RequestStage;
  /** Whether it applies to Document requests (page and iframe navigations). */
  documents: boolean;
}

/** Actions answered at the Response stage, derived from RULE_ACTION_SPECS. */
export type ResponseRuleAction = {
  [A in RuleAction]: (typeof RULE_ACTION_SPECS)[A]['stage'] extends 'Response' ? A : never;
}[RuleAction];

/** A rule answered at the Response stage. */
export type ResponseRule = Extract<Rule, { action: ResponseRuleAction }>;

/** Extracted from ResponseRule, not Rule, so a generic `A` still reaches `action` (see applyResponseRule). */
export type ResponseRuleOf<A extends ResponseRuleAction> = Extract<ResponseRule, { action: A }>;

/** Per Response-stage action, what it does to a response head. A new one fails typecheck until it has one. */
export type ResponseRuleAppliers = {
  [A in ResponseRuleAction]: (head: ResponseHead, rule: ResponseRuleOf<A>, request: PausedRequest) => ResponseHead;
};

export type HeaderOperationAppliers = Record<HeaderOperation, (headers: HeaderEntry[], edit: HeaderEdit) => HeaderEntry[]>;

/** The head after the matching rules, and the rules that changed it (in order). */
export interface RuledHead {
  head: ResponseHead;
  applied: string[];
}
