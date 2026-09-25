import { BLOCKED_BY_CLIENT, CDP } from '../constants';
import { findBlockRule } from '../rules';
import { continueRequest } from './continueRequest';
import { isPageDocument } from './isPageDocument';
import type { MatcherCache } from './MatcherCache';
import type { PausedRequestContext, RequestPausedParams } from './types';

/**
 * Request stage: only block rules pause here (overrides are never consulted,
 * so a URL both blocked and overridden stays blocked). The oldest matching
 * block rule fails the request before it is sent; the top-level page's own
 * document is never blocked.
 */
export async function answerRequestStage(ctx: PausedRequestContext, ruleMatchers: MatcherCache, p: RequestPausedParams): Promise<void> {
  const { cdp, opts, frames, resources } = ctx;
  const rule = isPageDocument(p.resourceType, p.frameId, frames, !!opts.iframe)
    ? undefined
    : findBlockRule(opts.getRules(), p.request.url, p.resourceType, ruleMatchers);
  // Continuing here still lets a Response-stage pattern pause it again.
  if (!rule) return continueRequest(cdp, p.requestId);
  await cdp.send(CDP.Fetch.failRequest, { requestId: p.requestId, errorReason: BLOCKED_BY_CLIENT });
  resources.listBlocked(p, rule.id);
  opts.emit({ type: 'rule-applied', ruleId: rule.id, url: p.request.url });
}
