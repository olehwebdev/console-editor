import type { Override } from '../../../shared/types';
import { CDP } from '../constants';
import { applyResponseRules, findResponseRules, isPreflight, pausedRequestOf, type PausedRequest, type ResponseHead, type ResponseRule } from '../rules';
import { buildOverrideHeaders, isRedirect, withUtf8ContentType } from '../transform';
import { answerRequestStage } from './answerRequestStage';
import { OTHER_RESOURCE_TYPE, OVERRIDE_STATUS, WORKER_SCRIPT_TYPES } from './constants';
import { continueRequest } from './continueRequest';
import { continueWithRules } from './continueWithRules';
import { emitApplied } from './emitApplied';
import { hasResponseHead } from './hasResponseHead';
import { isBenignCdpError } from './isBenignCdpError';
import { isHtmlDocument } from './isHtmlDocument';
import { isUpstreamOk } from './isUpstreamOk';
import { listPausedScript } from './listPausedScript';
import { MatcherCache } from './MatcherCache';
import { overrideBody } from './overrideBody';
import { pauseStage } from './pauseStage';
import { readPausedBody } from './readPausedBody';
import { reportError } from './reportError';
import { serveDocument } from './serveDocument';
import { sha256 } from './sha256';
import type { PausedRequestContext, RequestPausedParams, RequestStage } from './types';

/**
 * Answers the requests `Fetch` paused: before they are sent, by blocking them
 * (rules); once their response arrived, with an override, with the document
 * stripped of its SRI attributes or re-served with the rules' headers, with
 * the rules' header edits, or by letting them go on unchanged.
 */
export class PausedRequestHandler {
  /** How a paused request is answered, by the stage it paused at. */
  private readonly stages: Record<RequestStage, (p: RequestPausedParams) => Promise<void>> = {
    Request: (p) => answerRequestStage(this.ctx, this.ruleMatchers, p),
    Response: (p) => this.answerResponse(p),
  };
  /** Rules' compiled matchers, kept per matcher object: the rule store hands out the same objects until a rule changes. */
  private readonly ruleMatchers = new MatcherCache();

  constructor(private readonly ctx: PausedRequestContext) {}

  async handle(p: RequestPausedParams): Promise<void> {
    const { cdp, opts, worker } = this.ctx;
    try {
      // A shared worker's first script is paused on its creator's session; it must not start before
      // the worker's own session intercepts.
      if (p.resourceType === OTHER_RESOURCE_TYPE && !worker) await opts.workerSetups?.();
      await this.stages[pauseStage(p)](p);
    } catch (err) {
      // Fail open first: whatever went wrong, the page must never hang on this request.
      await continueRequest(cdp, p.requestId);
      // A frame or session that went away mid-request isn't the user's problem.
      if (!isBenignCdpError(err)) reportError(opts, `Interception failed for ${p.request.url}: ${(err as Error).message}`);
    }
  }

  /**
   * Response stage. An override chooses the body (never for a CORS preflight),
   * SRI stripping a document's; header and CORS rules edit the resulting
   * headers last. Anything nothing changes continues untouched.
   */
  private async answerResponse(p: RequestPausedParams): Promise<void> {
    const { cdp, opts, matcher, resources, worker, frames } = this.ctx;
    const workerScript = WORKER_SCRIPT_TYPES.has(p.resourceType);
    // With the page bypassing service workers, a service worker's other requests are its own fetches (a
    // precache, say): an edit served there would be stored in its caches and outlive the override.
    if (worker?.isServiceWorker && opts.getSettings().bypassServiceWorker && !workerScript) return continueRequest(cdp, p.requestId);
    const rules = findResponseRules(opts.getRules(), p.request.url, p.resourceType, this.ruleMatchers);
    const request = pausedRequestOf(p, frames.urlOf(p.frameId));
    const override = isPreflight(request) ? undefined : matcher.find(p.request.url, p.resourceType);
    if (worker?.isServiceWorker && workerScript) worker.paused(p.request.url, p.resourceType, matcher.version(p.request.url, p.resourceType));
    const listed = worker?.pausesScripts && workerScript ? worker : undefined;
    if (override && !isRedirect(p.responseStatusCode, p.responseHeaders)) {
      await this.serveOverride(p, override, rules, request);
      if (listed) listPausedScript(resources, listed, p, override.id);
      return;
    }
    if (isHtmlDocument(p) && (await serveDocument(this.ctx, p, rules, request))) return;
    if (rules.length > 0 && hasResponseHead(p)) await continueWithRules(this.ctx, p, rules, request);
    else await continueRequest(cdp, p.requestId);
    if (listed && !isRedirect(p.responseStatusCode, p.responseHeaders)) listPausedScript(resources, listed, p);
  }

  private async serveOverride(p: RequestPausedParams, override: Override, rules: readonly ResponseRule[], request: PausedRequest): Promise<void> {
    const { cdp, opts, resources, worker } = this.ctx;
    const settings = opts.getSettings();
    if (override.originalHash && isUpstreamOk(p)) {
      const upstream = await readPausedBody(cdp, p);
      if (upstream !== undefined && sha256(upstream) !== override.originalHash) {
        opts.emit({ type: 'upstream-changed', overrideId: override.id, url: p.request.url });
      }
    }

    const body = overrideBody(override, settings);
    // A new service worker version may fetch its script before its session reports anything (no networkId);
    // that script is reported under the worker's id.
    const reportedAs = p.networkId ?? (worker?.isOwnScript(p.request.url, p.resourceType) ? worker.info.targetId : undefined);
    // Recorded first: the response can be reported before the fulfil is answered.
    if (reportedAs) resources.markServed(reportedAs, override.id);
    // An override also answers requests whose upstream failed (404, 500, offline). Rules land last,
    // so a rule's Cache-Control beats the forced no-store, and CORS still checks what they wrote.
    const base: ResponseHead = { status: OVERRIDE_STATUS, headers: buildOverrideHeaders(p.responseHeaders, override.kind, settings) };
    const { head, applied } = applyResponseRules(base, rules, request);
    try {
      await cdp.send(CDP.Fetch.fulfillRequest, {
        requestId: p.requestId,
        responseCode: head.status,
        responseHeaders: withUtf8ContentType(head.headers),
        body: Buffer.from(body, 'utf8').toString('base64'),
      });
    } catch (err) {
      if (reportedAs) resources.unmarkServed(reportedAs);
      throw err;
    }
    opts.emit({ type: 'override-served', overrideId: override.id, url: p.request.url });
    emitApplied(opts, applied, p.request.url);
  }
}
