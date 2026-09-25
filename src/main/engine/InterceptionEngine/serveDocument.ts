import { CDP, CONTENT_TYPE, HTML_MIME_TYPE } from '../constants';
import { applyResponseRules, type PausedRequest, type ResponseRule } from '../rules';
import {
  buildRefulfilledHeaders,
  buildRewrittenHeaders,
  decodeBody,
  headerValue,
  isSuccessful,
  stripIntegrityAttributes,
  toBase64Body,
  withUtf8ContentType,
} from '../transform';
import { emitApplied } from './emitApplied';
import { phraseFor } from './phraseFor';
import { readPausedRaw } from './readPausedRaw';
import { reportError } from './reportError';
import { sha256 } from './sha256';
import { stripsIntegrity } from './stripsIntegrity';
import type { PausedRequestContext, PausedResponse } from './types';

/**
 * Re-serves an HTML document whose SRI attributes need stripping, or whose
 * headers rules change: a document enforces the CSP, X-Frame-Options and
 * Content-Type it arrived with, so only `Fetch.fulfillRequest` can change
 * them. One body read, at most one fulfil. The ruled head is worked out
 * first, so a document nothing changes is never read. Returns false when it
 * didn't answer the request.
 */
export async function serveDocument(ctx: PausedRequestContext, p: PausedResponse, rules: readonly ResponseRule[], request: PausedRequest): Promise<boolean> {
  const { cdp, opts, resources } = ctx;
  const strip = stripsIntegrity(opts.getOverrides(), opts.getSettings()) && isSuccessful(p.responseStatusCode);
  const status = p.responseStatusCode;
  const ruled = applyResponseRules({ status, headers: buildRefulfilledHeaders(p.responseHeaders) }, rules, request);
  if (!strip && ruled.applied.length === 0) return false;

  const raw = await readPausedRaw(cdp, p);
  if (!raw) {
    // The caller passes the head on with the rules anyway: what Chromium reads before the body (CSP, X-Frame-Options, Content-Type) can't change that way.
    if (ruled.applied.length > 0) {
      reportError(
        opts,
        `Could not re-serve ${p.request.url}: its other header changes still apply, but Content-Security-Policy, X-Frame-Options and Content-Type stay as the server sent them`,
      );
    }
    return false;
  }

  if (strip) {
    const html = decodeBody(raw.body, raw.base64Encoded, headerValue(p.responseHeaders, CONTENT_TYPE));
    const stripped = stripIntegrityAttributes(html);
    if (stripped.count > 0) {
      if (p.networkId) resources.markRewritten(p.networkId, sha256(html));
      const rewritten = applyResponseRules({ status, headers: buildRewrittenHeaders(p.responseHeaders, HTML_MIME_TYPE) }, rules, request);
      await cdp.send(CDP.Fetch.fulfillRequest, {
        requestId: p.requestId,
        responseCode: rewritten.head.status,
        ...phraseFor(p, rewritten.head.status),
        responseHeaders: withUtf8ContentType(rewritten.head.headers),
        body: Buffer.from(stripped.html, 'utf8').toString('base64'),
      });
      emitApplied(opts, rewritten.applied, p.request.url);
      return true;
    }
  }
  // Nothing stripped, and the rules change nothing: it continues as it came (fine after a body read).
  if (ruled.applied.length === 0) return false;

  const { body, reencoded } = toBase64Body(raw);
  await cdp.send(CDP.Fetch.fulfillRequest, {
    requestId: p.requestId,
    responseCode: ruled.head.status,
    ...phraseFor(p, ruled.head.status),
    responseHeaders: reencoded ? withUtf8ContentType(ruled.head.headers) : ruled.head.headers,
    body,
  });
  emitApplied(opts, ruled.applied, p.request.url);
  return true;
}
