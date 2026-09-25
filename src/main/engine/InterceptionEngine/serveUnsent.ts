import type { Override } from '../../../shared/types';
import { CDP } from '../constants';
import { applyCors, applyResponseRules, type PausedRequest, type ResponseRule } from '../rules';
import { withUtf8ContentType } from '../transform';
import { emitApplied } from './emitApplied';
import { holdFor } from './holdFor';
import { overrideBody } from './overrideBody';
import { overrideHead } from './overrideHead';
import type { PausedRequestContext, RequestPausedParams } from './types';

/**
 * Answers a request with a response override before it is sent: the server never sees it. No response
 * came to take headers from, so the head is the override's own (its type, no caching, its status and
 * header changes), allowing the page's origin to read it, with the rules' edits last.
 */
export async function serveUnsent(ctx: PausedRequestContext, p: RequestPausedParams, override: Override, rules: readonly ResponseRule[], request: PausedRequest): Promise<void> {
  const { cdp, opts } = ctx;
  const settings = opts.getSettings();
  const { head, applied } = applyResponseRules(applyCors(overrideHead(p, override, settings), request), rules, request);
  // A response override may hold its answer back, to show the page's loading state.
  await holdFor(override.response?.delayMs ?? 0);
  await cdp.send(CDP.Fetch.fulfillRequest, {
    requestId: p.requestId,
    responseCode: head.status,
    responseHeaders: withUtf8ContentType(head.headers),
    body: Buffer.from(overrideBody(override, settings), 'utf8').toString('base64'),
  });
  opts.emit({ type: 'override-served', overrideId: override.id, url: p.request.url, ...(p.networkId ? { requestId: p.networkId } : {}) });
  emitApplied(opts, applied, p.request.url);
}
