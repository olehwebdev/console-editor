import { BLOCKED_BY_CLIENT, CDP } from '../constants';
import { findBlockRule, pausedRequestOf } from '../rules';
import { answerUnsent } from './answerUnsent';
import { continueRequest } from './continueRequest';
import { isPageDocument } from './isPageDocument';
import type { MatcherCache } from './MatcherCache';
import { stopAtBreakpoint } from './stopAtBreakpoint';
import type { PausedRequestContext, RequestPausedParams } from './types';

/**
 * Request stage. The oldest matching block rule fails the request before it is sent (the top-level
 * page's own document is never blocked), so a URL both blocked and overridden stays blocked. Then a
 * breakpoint may hold it, and a response override that isn't sent answers it here (its preflight too).
 */
export async function answerRequestStage(ctx: PausedRequestContext, ruleMatchers: MatcherCache, p: RequestPausedParams): Promise<void> {
  const { cdp, opts, frames, resources } = ctx;
  const rule = isPageDocument(p.resourceType, p.frameId, frames, !!opts.iframe)
    ? undefined
    : findBlockRule(opts.getRules(), p.request.url, p.resourceType, ruleMatchers);
  if (rule) {
    await cdp.send(CDP.Fetch.failRequest, { requestId: p.requestId, errorReason: BLOCKED_BY_CLIENT });
    resources.listBlocked(p, rule.id);
    opts.emit({ type: 'rule-applied', ruleId: rule.id, url: p.request.url });
    return;
  }
  const request = pausedRequestOf(p, frames.urlOf(p.frameId));
  if (await stopAtBreakpoint(ctx, ruleMatchers, p, 'request', request)) return;
  if (await answerUnsent(ctx, ruleMatchers, p, request)) return;
  // Continuing here still lets a Response-stage pattern pause it again.
  await continueRequest(cdp, p.requestId);
}
