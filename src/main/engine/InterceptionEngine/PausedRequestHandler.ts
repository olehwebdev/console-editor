import type { Override } from '../../../shared/types';
import { CDP, CONTENT_TYPE, HTML_MIME_TYPE } from '../constants';
import { buildOverrideHeaders, buildRewrittenHeaders, headerValue, isRedirect, stripIntegrityAttributes } from '../transform';
import { DOCUMENT_KIND, OTHER_RESOURCE_TYPE, OVERRIDE_STATUS, WORKER_SCRIPT_TYPES } from './constants';
import { continueRequest } from './continueRequest';
import { isBenignCdpError } from './isBenignCdpError';
import { isUpstreamOk } from './isUpstreamOk';
import { listPausedScript } from './listPausedScript';
import { overrideBody } from './overrideBody';
import { readPausedBody } from './readPausedBody';
import { sha256 } from './sha256';
import type { PausedRequestContext, RequestPausedParams } from './types';

/** Part of every HTML content type; a document whose type lacks it isn't rewritten. */
const HTML_TYPE_MARKER = 'html';

/**
 * Answers the requests `Fetch` paused: with an override, with the document
 * stripped of its SRI attributes, or by letting them go on unchanged.
 */
export class PausedRequestHandler {
  constructor(private readonly ctx: PausedRequestContext) {}

  async handle(p: RequestPausedParams): Promise<void> {
    const { cdp, opts, matcher, resources, worker } = this.ctx;
    try {
      const workerScript = WORKER_SCRIPT_TYPES.has(p.resourceType);
      // A shared worker's first script is paused on its creator's session; it must not start before
      // the worker's own session intercepts.
      if (p.resourceType === OTHER_RESOURCE_TYPE && !worker) await opts.workerSetups?.();
      // With the page bypassing service workers, a service worker's other requests are its own fetches (a
      // precache, say): an edit served there would be stored in its caches and outlive the override.
      if (worker?.isServiceWorker && opts.getSettings().bypassServiceWorker && !workerScript) {
        await continueRequest(cdp, p.requestId);
        return;
      }
      const override = matcher.find(p.request.url, p.resourceType);
      if (worker?.isServiceWorker && workerScript) worker.paused(p.request.url, p.resourceType, matcher.version(p.request.url, p.resourceType));
      const listed = worker?.pausesScripts && workerScript ? worker : undefined;
      if (override && !isRedirect(p.responseStatusCode, p.responseHeaders)) {
        await this.serveOverride(p, override);
        if (listed) listPausedScript(resources, listed, p, override.id);
        return;
      }
      if (
        p.resourceType === DOCUMENT_KIND &&
        opts.getSettings().stripIntegrity &&
        isUpstreamOk(p) &&
        (headerValue(p.responseHeaders, CONTENT_TYPE) ?? HTML_MIME_TYPE).includes(HTML_TYPE_MARKER)
      ) {
        if (await this.serveWithoutIntegrity(p)) return;
      }
      await continueRequest(cdp, p.requestId);
      if (listed && !isRedirect(p.responseStatusCode, p.responseHeaders)) listPausedScript(resources, listed, p);
    } catch (err) {
      // A frame or session that went away mid-request isn't the user's problem.
      if (!isBenignCdpError(err)) {
        opts.emit({ type: 'error', message: `Interception failed for ${p.request.url}: ${(err as Error).message}` });
      }
      await continueRequest(cdp, p.requestId);
    }
  }

  private async serveOverride(p: RequestPausedParams, override: Override): Promise<void> {
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
    try {
      // An override also answers requests whose upstream failed (404, 500, offline).
      await cdp.send(CDP.Fetch.fulfillRequest, {
        requestId: p.requestId,
        responseCode: OVERRIDE_STATUS,
        responseHeaders: buildOverrideHeaders(p.responseHeaders, override.kind, settings),
        body: Buffer.from(body, 'utf8').toString('base64'),
      });
    } catch (err) {
      if (reportedAs) resources.unmarkServed(reportedAs);
      throw err;
    }
    opts.emit({ type: 'override-served', overrideId: override.id, url: p.request.url });
  }

  /** Strips SRI attributes from an HTML document. Returns false when nothing needed changing. */
  private async serveWithoutIntegrity(p: RequestPausedParams): Promise<boolean> {
    const { cdp, resources } = this.ctx;
    const html = await readPausedBody(cdp, p);
    if (html === undefined) return false;
    const stripped = stripIntegrityAttributes(html);
    if (stripped.count === 0) return false;
    if (p.networkId) resources.markRewritten(p.networkId, sha256(html));
    await cdp.send(CDP.Fetch.fulfillRequest, {
      requestId: p.requestId,
      responseCode: p.responseStatusCode,
      responseHeaders: buildRewrittenHeaders(p.responseHeaders, HTML_MIME_TYPE),
      body: Buffer.from(stripped.html, 'utf8').toString('base64'),
    });
    return true;
  }
}
