import { findResponseRules, isPreflight, preflightMethod, type PausedRequest } from '../rules';
import { answerPreflight } from './answerPreflight';
import type { MatcherCache } from './MatcherCache';
import { matchedRequestOf } from './matchedRequestOf';
import { sendsRequest } from './sendsRequest';
import { serveUnsent } from './serveUnsent';
import type { PausedRequestContext, RequestPausedParams } from './types';

/**
 * Request stage: answers a request a response override answers without sending it, and the CORS
 * preflight asking to send one (whatever GraphQL operation its body will name). False when neither
 * applies: the request goes on.
 */
export async function answerUnsent(ctx: PausedRequestContext, ruleMatchers: MatcherCache, p: RequestPausedParams, request: PausedRequest): Promise<boolean> {
  const { matcher, opts } = ctx;
  if (isPreflight(request)) {
    if (!matcher.unsentFor(p.request.url, p.resourceType, preflightMethod(request)!)) return false;
    await answerPreflight(ctx.cdp, p.requestId, request);
    return true;
  }
  const override = matcher.find(p.request.url, p.resourceType, matchedRequestOf(request));
  if (!override || sendsRequest(override)) return false;
  await serveUnsent(ctx, p, override, findResponseRules(opts.getRules(), p.request.url, p.resourceType, ruleMatchers), request);
  return true;
}
