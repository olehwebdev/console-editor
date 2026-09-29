import { matchedRequestOf } from '../InterceptionEngine/matchedRequestOf';
import { overrideBody } from '../InterceptionEngine/overrideBody';
import { applyCors, findBlockRule, isPreflight, preflightMethod, type PausedRequest } from '../rules';
import { PREFLIGHT_STATUS } from '../rules/constants';
import { PREFLIGHT_RESOURCE } from './constants';
import { servedHead } from './servedHead';
import type { AnswerContext, RequestDecision } from './types';

/**
 * What to do with a request before it is sent, where a browser can only replace a response then (Firefox, WebKit):
 * fail it when a block rule takes it; allow a CORS preflight ahead of a request an override answers (whatever GraphQL
 * operation it names); answer a request an override takes with it; send anything else on. An override naming an
 * operation answers only a request whose body the browser gave.
 */
export function decideRequest(ctx: AnswerContext, request: PausedRequest, resourceType: string): RequestDecision {
  const { sources, overrides, matchers } = ctx;
  if (findBlockRule(sources.getRules(), request.url, resourceType, matchers)) return { action: 'fail' };
  const method = isPreflight(request) ? preflightMethod(request) : undefined;
  if (method && overrides.preflightFor(request.url, PREFLIGHT_RESOURCE, method)) {
    return { action: 'answer', head: applyCors({ status: PREFLIGHT_STATUS, headers: [] }, request), body: '', delayMs: 0 };
  }
  const override = overrides.find(request.url, resourceType, matchedRequestOf(request));
  if (!override) return { action: 'continue' };
  return { action: 'answer', head: servedHead(override, request, resourceType, ctx), body: overrideBody(override, sources.getSettings()), delayMs: override.response?.delayMs ?? 0 };
}
