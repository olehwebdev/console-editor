import { CDP } from '../constants';
import { applyResponseRules, type PausedRequest, type ResponseRule } from '../rules';
import { continueRequest } from './continueRequest';
import { emitApplied } from './emitApplied';
import { phraseFor } from './phraseFor';
import type { PausedRequestContext, PausedResponse } from './types';

/**
 * Passes a response on with the rules' header edits, its body streaming
 * through untouched. Chromium wants the code with the headers, and takes the
 * list as the whole new list. A response the rules don't change continues.
 */
export async function continueWithRules(
  { cdp, opts }: PausedRequestContext,
  p: PausedResponse,
  rules: readonly ResponseRule[],
  request: PausedRequest,
): Promise<void> {
  const { head, applied } = applyResponseRules({ status: p.responseStatusCode, headers: p.responseHeaders }, rules, request);
  if (applied.length === 0) return continueRequest(cdp, p.requestId);
  await cdp.send(CDP.Fetch.continueResponse, {
    requestId: p.requestId,
    responseCode: head.status,
    ...phraseFor(p, head.status),
    responseHeaders: head.headers,
  });
  emitApplied(opts, applied, p.request.url);
}
