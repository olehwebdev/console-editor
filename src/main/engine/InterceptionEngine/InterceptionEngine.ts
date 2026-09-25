import type { MatchType, Override, ResourceContent, ResourceEntry, ResourceKind } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import { BLOCKED_BY_CLIENT, CDP, CONTENT_TYPE, HTML_MIME_TYPE } from '../constants';
import {
  applyResponseRules,
  findBlockRule,
  findResponseRules,
  isPreflight,
  pausedRequestOf,
  type PausedRequest,
  type ResponseHead,
  type ResponseRule,
} from '../rules';
import {
  buildOverrideHeaders,
  buildRefulfilledHeaders,
  buildRewrittenHeaders,
  decodeBody,
  headerValue,
  isRedirect,
  isSuccessful,
  SRI_GUARD_SOURCE,
  stripIntegrityAttributes,
  stripSourceMapComments,
  toBase64Body,
  withUtf8ContentType,
  type RawBody,
} from '../transform';
import { answersKind } from './answersKind';
import { computeFetchPatterns } from './computeFetchPatterns';
import { BLOCKED_STATUS, DOCUMENT_KIND } from './constants';
import { hasResponseHead } from './hasResponseHead';
import { isBenignCdpError } from './isBenignCdpError';
import { isKind } from './isKind';
import { MatcherCache } from './MatcherCache';
import { pauseStage } from './pauseStage';
import { phraseFor } from './phraseFor';
import { sha256 } from './sha256';
import { stripsIntegrity } from './stripsIntegrity';
import type { EngineOptions, FrameTree, PausedResponse, RequestPausedParams, RequestStage, TrackedResource } from './types';

const MATCH_RANK = { exact: 0, glob: 1, regex: 2 } as const satisfies Record<MatchType, number>;

/** How much response data Chromium keeps for `Network.getResponseBody`, in all and per response. */
const MAX_TOTAL_BUFFER_BYTES = 256 * 1024 * 1024;
const MAX_RESOURCE_BUFFER_BYTES = 64 * 1024 * 1024;

/** An override answers with a success, whatever upstream said. */
const OVERRIDE_STATUS = 200;

/** Part of every HTML content type; a document whose type lacks it isn't rewritten. */
const HTML_TYPE_MARKER = 'html';

/** URLs never listed: they name no file that could be overridden. */
const UNLISTED_URL = /^(data|blob|about|chrome|devtools):/;

/** `Page.frameDetached` reason of a frame that moved to another process. */
const SWAP_REASON = 'swap';

/** Bounds the walk up `frameParents`, which a stale entry could turn into a loop. */
const MAX_FRAME_DEPTH = 32;

/** Joins an override or rule id and a URL into a `missed` / `missedRules` key. */
const MISSED_KEY_SEPARATOR = '|';

/**
 * Serves edited files in place of the originals, blocks requests and edits
 * response headers by driving the Chrome DevTools Protocol `Fetch` domain, and
 * keeps a list of the page's scripts, stylesheets and documents via the
 * `Network` domain.
 *
 * A request pauses at the Request stage only for block rules (before anything
 * is sent), and at the Response stage for overrides, SRI stripping and header
 * or CORS rules. Whatever goes wrong, a paused request is always let through.
 *
 * The engine only needs a {@link CdpTransport}, so the same code drives an
 * Electron `webContents.debugger`, an external Chrome, or a test double.
 */
export class InterceptionEngine {
  private readonly resources = new Map<string, TrackedResource>();
  /** Network requestId -> id of the override that served it. */
  private readonly servedBy = new Map<string, string>();
  private readonly matchers = new MatcherCache();
  /** Frame id -> document URL for every frame this session knows about. */
  private readonly frameUrls = new Map<string, string>();
  /** Frame id -> parent frame id, to compute iframe depth. */
  private readonly frameParents = new Map<string, string>();
  /** `${overrideId}|${url}` already reported as missed since the last navigation. */
  private readonly missed = new Set<string>();
  /** `${ruleId}|${url}` of block rules already reported as missed since the last navigation. */
  private readonly missedRules = new Set<string>();
  /**
   * Network requestId -> hash of the raw upstream body of a document we
   * rewrote (SRI stripped), until its response is tracked. The page, and so
   * `Network.getResponseBody`, only ever saw the rewritten HTML.
   */
  private readonly rewritten = new Map<string, string>();
  private readonly disposers: Array<() => void> = [];
  private mainFrameId: string | undefined;
  /** Parent frame of an iframe session's root frame (it lives in the parent's session). */
  private rootParentFrameId: string | undefined;
  /** Nesting depth of this session's root frame (0 for the page's own session). */
  private baseDepth: number;
  /**
   * A navigation of this session's root frame that has started but not
   * committed. Until it commits, the old document keeps loading things (they
   * must not be listed as the new page's), and it may never commit at all
   * (a download, a 204), in which case the list must stay as it is.
   */
  private pending: { loaderId: string; held: TrackedResource[] } | undefined;
  private fetchEnabled = false;
  /** Identifier of the injected SRI guard script, while installed. */
  private sriGuardId: string | undefined;
  private queue: Promise<void> = Promise.resolve();
  /** How a paused request is answered, by the stage it paused at. */
  private readonly stageHandlers: Record<RequestStage, (p: RequestPausedParams) => Promise<void>> = {
    Request: (p) => this.answerRequest(p),
    Response: (p) => this.answerResponse(p),
  };

  constructor(private readonly opts: EngineOptions) {
    this.baseDepth = opts.iframe?.depth ?? 0;
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on(CDP.Fetch.requestPaused, (p: RequestPausedParams) => void this.onRequestPaused(p).catch(() => undefined)),
      this.cdp.on(CDP.Network.requestWillBeSent, (p) => this.onRequestWillBeSent(p)),
      this.cdp.on(CDP.Network.responseReceived, (p) => this.onResponseReceived(p)),
      this.cdp.on(CDP.Page.frameNavigated, (p: { frame: { id: string; parentId?: string; url: string; loaderId?: string } }) => {
        this.frameUrls.set(p.frame.id, p.frame.url);
        // An iframe session's root frame has a (cross-process) parentId; it stays the root.
        if (p.frame.parentId && p.frame.id !== this.mainFrameId) this.frameParents.set(p.frame.id, p.frame.parentId);
        if (!p.frame.parentId && !this.opts.iframe) this.mainFrameId = p.frame.id;
        if (p.frame.id === this.mainFrameId) this.commitNavigation(p.frame);
      }),
      this.cdp.on(CDP.Page.frameStoppedLoading, (p: { frameId: string }) => {
        // Stopped without committing (download, 204, cancelled): the old page stays, and so does its list.
        if (p.frameId === this.mainFrameId && this.pending) this.pending = undefined;
      }),
      this.cdp.on(CDP.Page.frameAttached, (p: { frameId: string; parentFrameId?: string }) => {
        if (p.parentFrameId) this.frameParents.set(p.frameId, p.parentFrameId);
      }),
      this.cdp.on(CDP.Page.frameDetached, (p: { frameId: string; reason?: string }) => {
        this.frameUrls.delete(p.frameId);
        // A frame that moved to another process still has its documents reported here.
        if (p.reason !== SWAP_REASON) this.frameParents.delete(p.frameId);
      }),
    );
    await this.cdp.send(CDP.Page.enable);
    const tree = await this.cdp.send<{ frameTree: FrameTree }>(CDP.Page.getFrameTree);
    this.mainFrameId = tree.frameTree.frame.id;
    this.rootParentFrameId = tree.frameTree.frame.parentId;
    this.rememberFrames(tree.frameTree);
    await this.cdp.send(CDP.Network.enable, {
      maxTotalBufferSize: MAX_TOTAL_BUFFER_BYTES,
      maxResourceBufferSize: MAX_RESOURCE_BUFFER_BYTES,
    });
    await this.applySettings();
  }

  detach(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    if (this.fetchEnabled) {
      this.fetchEnabled = false;
      this.cdp.send(CDP.Fetch.disable).catch(() => undefined);
    }
  }

  /** Re-applies settings (cache, service workers, CSP) and interception patterns. */
  applySettings(): Promise<void> {
    return this.serialize(async () => {
      const s = this.opts.getSettings();
      await this.cdp.send(CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache });
      await this.cdp.send(CDP.Network.setBypassServiceWorker, { bypass: s.bypassServiceWorker });
      await this.cdp.send(CDP.Page.setBypassCSP, { enabled: s.bypassCSP });
      if (s.stripIntegrity && !this.sriGuardId) {
        const r = await this.cdp.send<{ identifier: string }>(CDP.Page.addScriptToEvaluateOnNewDocument, { source: SRI_GUARD_SOURCE });
        this.sriGuardId = r.identifier;
      } else if (!s.stripIntegrity && this.sriGuardId) {
        await this.cdp.send(CDP.Page.removeScriptToEvaluateOnNewDocument, { identifier: this.sriGuardId });
        this.sriGuardId = undefined;
      }
      await this.updatePatterns();
    });
  }

  /** Call after overrides or rules were added, removed, enabled/disabled or re-matched. */
  refreshInterception(): Promise<void> {
    return this.serialize(() => this.updatePatterns());
  }

  listResources(): ResourceEntry[] {
    return [...this.resources.values()].map((r) => r.entry);
  }

  hasResource(url: string): boolean {
    return this.resources.has(url);
  }

  /** For an iframe session: the frame (in the parent's session) that contains its root frame. */
  get parentFrameId(): string | undefined {
    return this.opts.iframe ? this.rootParentFrameId : undefined;
  }

  /** Nesting depth of a frame of this session (0 = the top-level page). */
  frameDepth(frameId: string | undefined): number {
    return this.baseDepth + this.localDepth(frameId);
  }

  /** Corrects this iframe session's depth once its position in the parent is known. */
  setBaseDepth(depth: number): void {
    this.baseDepth = depth;
  }

  /** Raw upstream hash of a listed document this engine rewrote (SRI stripped), if any. */
  upstreamHashOf(url: string): string | undefined {
    return this.resources.get(url)?.upstreamHash;
  }

  /** The request id and frame of a listed resource (for reading its body through another session). */
  trackedResource(url: string): { requestId: string; frameId?: string; mimeType: string } | undefined {
    const r = this.resources.get(url);
    return r && { requestId: r.requestId, frameId: r.frameId, mimeType: r.entry.mimeType };
  }

  /** Reads a response body from this session by network request id. */
  async readNetworkBody(url: string, requestId: string, mimeType?: string): Promise<ResourceContent> {
    const r = await this.cdp.send<{ body: string; base64Encoded: boolean }>(CDP.Network.getResponseBody, { requestId });
    const content = decodeBody(r.body, r.base64Encoded, mimeType);
    return { url, content, hash: sha256(content) };
  }

  private rememberFrames(node: FrameTree): void {
    if (node.frame.url) this.frameUrls.set(node.frame.id, node.frame.url);
    if (node.frame.parentId && node.frame.id !== this.mainFrameId) this.frameParents.set(node.frame.id, node.frame.parentId);
    for (const child of node.childFrames ?? []) this.rememberFrames(child);
  }

  /**
   * Returns the upstream content of a resource the page loaded. Resources that
   * were served from an override are re-fetched so we never mistake the edited
   * copy for the original, and so are blocked ones, which the page never got.
   */
  async getResourceContent(url: string): Promise<ResourceContent> {
    const tracked = this.resources.get(url);
    const attempts: Array<() => Promise<string>> = [];
    // A blocked request has no body in the page: it is fetched outside the page's interception.
    if (tracked && !tracked.entry.overrideId && !tracked.entry.blockedBy) {
      attempts.push(async () => {
        const r = await this.cdp.send<{ body: string; base64Encoded: boolean }>(CDP.Network.getResponseBody, {
          requestId: tracked.requestId,
        });
        return decodeBody(r.body, r.base64Encoded, tracked.entry.mimeType);
      });
      if (tracked.frameId) {
        const frameId = tracked.frameId;
        attempts.push(async () => {
          const r = await this.cdp.send<{ content: string; base64Encoded: boolean }>(CDP.Page.getResourceContent, {
            frameId,
            url,
          });
          return decodeBody(r.content, r.base64Encoded);
        });
      }
    }
    const fallback = this.opts.fallbackFetch;
    if (fallback) attempts.push(() => fallback(url));

    let lastError: unknown = new Error(`No content available for ${url}`);
    for (const attempt of attempts) {
      try {
        const content = await attempt();
        return { url, content, hash: tracked?.upstreamHash ?? sha256(content) };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  /**
   * Finds the enabled override for a URL. Exact beats glob beats regex; newer
   * beats older. With a `resourceType`, documents, scripts and stylesheets are
   * only answered by an override of their own kind (so a broad pattern can't
   * put JS in a stylesheet or replace a page); other requests (fetch, XHR,
   * preload) by script and style overrides.
   */
  findOverride(url: string, resourceType?: string): Override | undefined {
    let best: Override | undefined;
    for (const o of this.opts.getOverrides()) {
      if (!o.enabled || !this.matchers.predicate(o.match)(url)) continue;
      if (resourceType && !answersKind(o.kind, resourceType)) continue;
      if (
        !best ||
        MATCH_RANK[o.match.type] < MATCH_RANK[best.match.type] ||
        (MATCH_RANK[o.match.type] === MATCH_RANK[best.match.type] && o.updatedAt > best.updatedAt)
      ) {
        best = o;
      }
    }
    return best;
  }

  private serialize(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async updatePatterns(): Promise<void> {
    this.matchers.clear();
    const patterns = computeFetchPatterns(this.opts.getOverrides(), this.opts.getRules(), this.opts.getSettings());
    if (patterns.length === 0) {
      if (this.fetchEnabled) {
        await this.cdp.send(CDP.Fetch.disable);
        this.fetchEnabled = false;
      }
      return;
    }
    await this.cdp.send(CDP.Fetch.enable, { patterns });
    this.fetchEnabled = true;
  }

  private async onRequestPaused(p: RequestPausedParams): Promise<void> {
    try {
      await this.stageHandlers[pauseStage(p)](p);
    } catch (err) {
      // Fail open first: whatever went wrong, the page must never hang on this request.
      await this.continue(p.requestId);
      // A frame or session that went away mid-request isn't the user's problem.
      if (!isBenignCdpError(err)) this.report(`Interception failed for ${p.request.url}: ${(err as Error).message}`);
    }
  }

  /** Reports an error to the user; the window may be gone, which must not stop anything. */
  private report(message: string): void {
    try {
      this.opts.emit({ type: 'error', message });
    } catch {
      // Nobody left to tell.
    }
  }

  /**
   * Request stage: only block rules pause here (overrides are never consulted,
   * so a URL both blocked and overridden stays blocked). The top-level page's
   * own document is never blocked.
   */
  private async answerRequest(p: RequestPausedParams): Promise<void> {
    const rule = this.isPageDocument(p.resourceType, p.frameId)
      ? undefined
      : findBlockRule(this.opts.getRules(), p.request.url, p.resourceType, this.matchers);
    // Continuing here still lets a Response-stage pattern pause it again.
    if (!rule) return this.continue(p.requestId);
    await this.cdp.send(CDP.Fetch.failRequest, { requestId: p.requestId, errorReason: BLOCKED_BY_CLIENT });
    this.listBlocked(p, rule.id);
    this.opts.emit({ type: 'rule-applied', ruleId: rule.id, url: p.request.url });
  }

  /**
   * Whether a request is the top-level page's own document (never blocked). A
   * pause without a frame counts as the page: the safe side. Iframe documents,
   * which pause on their parent's session, stay blockable.
   */
  private isPageDocument(resourceType: string, frameId: string | undefined): boolean {
    return !this.opts.iframe && resourceType === DOCUMENT_KIND && (!frameId || frameId === this.mainFrameId);
  }

  /**
   * Response stage. An override chooses the body (never for a CORS preflight),
   * SRI stripping a document's; header and CORS rules edit the resulting
   * headers last. Anything nothing changes continues untouched.
   */
  private async answerResponse(p: RequestPausedParams): Promise<void> {
    const rules = findResponseRules(this.opts.getRules(), p.request.url, p.resourceType, this.matchers);
    const request = pausedRequestOf(p, this.frameUrls.get(p.frameId ?? this.mainFrameId ?? ''));
    const override = isPreflight(request) ? undefined : this.findOverride(p.request.url, p.resourceType);
    if (override && !isRedirect(p.responseStatusCode, p.responseHeaders)) return this.serveOverride(p, override, rules, request);
    if (this.isHtmlDocument(p) && (await this.serveDocument(p, rules, request))) return;
    if (rules.length > 0 && hasResponseHead(p)) return this.continueWithRules(p, rules, request);
    return this.continue(p.requestId);
  }

  /** An HTML document with a whole, non-redirect response: never a navigated PDF or a download. */
  private isHtmlDocument(p: RequestPausedParams): p is PausedResponse {
    return (
      p.resourceType === DOCUMENT_KIND &&
      hasResponseHead(p) &&
      !isRedirect(p.responseStatusCode, p.responseHeaders) &&
      (headerValue(p.responseHeaders, CONTENT_TYPE) ?? HTML_MIME_TYPE).includes(HTML_TYPE_MARKER)
    );
  }

  private async serveOverride(p: RequestPausedParams, override: Override, rules: readonly ResponseRule[], request: PausedRequest): Promise<void> {
    const settings = this.opts.getSettings();
    if (override.originalHash && isSuccessful(p.responseStatusCode)) {
      const raw = await this.readPausedRaw(p);
      const upstream = raw && decodeBody(raw.body, raw.base64Encoded, headerValue(p.responseHeaders, CONTENT_TYPE));
      if (upstream !== undefined && sha256(upstream) !== override.originalHash) {
        this.opts.emit({ type: 'upstream-changed', overrideId: override.id, url: p.request.url });
      }
    }

    let body = override.content;
    if (override.kind === DOCUMENT_KIND) {
      if (settings.stripIntegrity) body = stripIntegrityAttributes(body).html;
    } else if (settings.stripSourceMaps) {
      body = stripSourceMapComments(body);
    }

    if (p.networkId) this.servedBy.set(p.networkId, override.id);
    // An override also answers requests whose upstream failed (404, 500, offline). Rules land last,
    // so a rule's Cache-Control beats the forced no-store, and CORS still checks what they wrote.
    const base: ResponseHead = { status: OVERRIDE_STATUS, headers: buildOverrideHeaders(p.responseHeaders, override.kind, settings) };
    const { head, applied } = applyResponseRules(base, rules, request);
    await this.cdp.send(CDP.Fetch.fulfillRequest, {
      requestId: p.requestId,
      responseCode: head.status,
      responseHeaders: withUtf8ContentType(head.headers),
      body: Buffer.from(body, 'utf8').toString('base64'),
    });
    this.opts.emit({ type: 'override-served', overrideId: override.id, url: p.request.url });
    this.emitApplied(applied, p.request.url);
  }

  /**
   * Re-serves an HTML document whose SRI attributes need stripping, or whose
   * headers rules change: a document enforces the CSP, X-Frame-Options and
   * Content-Type it arrived with, so only `Fetch.fulfillRequest` can change
   * them. One body read, at most one fulfil. The ruled head is worked out
   * first, so a document nothing changes is never read. Returns false when it
   * didn't answer the request.
   */
  private async serveDocument(p: PausedResponse, rules: readonly ResponseRule[], request: PausedRequest): Promise<boolean> {
    const strip = stripsIntegrity(this.opts.getOverrides(), this.opts.getSettings()) && isSuccessful(p.responseStatusCode);
    const status = p.responseStatusCode;
    const ruled = applyResponseRules({ status, headers: buildRefulfilledHeaders(p.responseHeaders) }, rules, request);
    if (!strip && ruled.applied.length === 0) return false;

    const raw = await this.readPausedRaw(p);
    if (!raw) {
      if (ruled.applied.length > 0) {
        this.report(`Could not re-serve ${p.request.url} to change its headers; security headers such as CSP stay as the server sent them`);
      }
      return false;
    }

    if (strip) {
      const html = decodeBody(raw.body, raw.base64Encoded, headerValue(p.responseHeaders, CONTENT_TYPE));
      const stripped = stripIntegrityAttributes(html);
      if (stripped.count > 0) {
        if (p.networkId) this.rewritten.set(p.networkId, sha256(html));
        const rewritten = applyResponseRules({ status, headers: buildRewrittenHeaders(p.responseHeaders, HTML_MIME_TYPE) }, rules, request);
        await this.cdp.send(CDP.Fetch.fulfillRequest, {
          requestId: p.requestId,
          responseCode: rewritten.head.status,
          ...phraseFor(p, rewritten.head.status),
          responseHeaders: withUtf8ContentType(rewritten.head.headers),
          body: Buffer.from(stripped.html, 'utf8').toString('base64'),
        });
        this.emitApplied(rewritten.applied, p.request.url);
        return true;
      }
    }
    // Nothing stripped, and the rules change nothing: it continues as it came (fine after a body read).
    if (ruled.applied.length === 0) return false;

    const { body, reencoded } = toBase64Body(raw);
    await this.cdp.send(CDP.Fetch.fulfillRequest, {
      requestId: p.requestId,
      responseCode: ruled.head.status,
      ...phraseFor(p, ruled.head.status),
      responseHeaders: reencoded ? withUtf8ContentType(ruled.head.headers) : ruled.head.headers,
      body,
    });
    this.emitApplied(ruled.applied, p.request.url);
    return true;
  }

  /**
   * Passes a response on with the rules' header edits, its body streaming
   * through untouched. Chromium wants the code with the headers, and takes the
   * list as the whole new list. A response the rules don't change continues.
   */
  private async continueWithRules(p: PausedResponse, rules: readonly ResponseRule[], request: PausedRequest): Promise<void> {
    const { head, applied } = applyResponseRules({ status: p.responseStatusCode, headers: p.responseHeaders }, rules, request);
    if (applied.length === 0) return this.continue(p.requestId);
    await this.cdp.send(CDP.Fetch.continueResponse, {
      requestId: p.requestId,
      responseCode: head.status,
      ...phraseFor(p, head.status),
      responseHeaders: head.headers,
    });
    this.emitApplied(applied, p.request.url);
  }

  /** One `rule-applied` per rule that changed something, once Chromium took the change. */
  private emitApplied(ruleIds: readonly string[], url: string): void {
    for (const ruleId of ruleIds) this.opts.emit({ type: 'rule-applied', ruleId, url });
  }

  /** The paused response's body as CDP returns it, or undefined when it can't be read. */
  private async readPausedRaw(p: RequestPausedParams): Promise<RawBody | undefined> {
    try {
      return await this.cdp.send<RawBody>(CDP.Fetch.getResponseBody, { requestId: p.requestId });
    } catch {
      return undefined;
    }
  }

  /**
   * Lists a blocked document, script or stylesheet, which never gets a
   * `Network.responseReceived`, so the file stays in the tree (and can still be
   * opened). Not while the main frame is navigating: it would be the old page's.
   */
  private listBlocked(p: RequestPausedParams, ruleId: string): void {
    const url = p.request.url;
    if (!isKind(p.resourceType) || UNLISTED_URL.test(url) || this.pending) return;
    const kind = p.resourceType;
    const frame = this.frameOf(p.frameId, kind === DOCUMENT_KIND ? url : undefined);
    const existing = this.resources.get(url);
    // The same file blocked in the top frame and in an iframe is listed as the top frame's.
    if (existing && !existing.entry.frame && frame && existing.entry.blockedBy === ruleId) return;
    const iframeId = this.opts.iframe?.id;
    const entry: ResourceEntry = {
      url,
      kind,
      mimeType: '',
      status: BLOCKED_STATUS,
      blockedBy: ruleId,
      ...(frame ? { frame } : {}),
      ...(iframeId ? { iframeId } : {}),
    };
    this.resources.set(url, { entry, requestId: p.networkId ?? p.requestId, frameId: p.frameId });
    this.opts.emit({ type: 'resource', resource: entry });
  }

  private async continue(requestId: string): Promise<void> {
    try {
      await this.cdp.send(CDP.Fetch.continueRequest, { requestId });
    } catch {
      // The request was cancelled (e.g. the page navigated away); nothing to do.
    }
  }

  private onRequestWillBeSent(p: {
    requestId: string;
    loaderId: string;
    frameId?: string;
    type?: string;
    documentURL: string;
    request: { url: string };
  }): void {
    const isMainFrameNavigation =
      p.type === DOCUMENT_KIND && p.requestId === p.loaderId && (!this.mainFrameId || p.frameId === this.mainFrameId);
    if (!isMainFrameNavigation) return;
    // Redirects re-send the same request; keep what was already held.
    if (this.pending?.loaderId !== p.loaderId) this.pending = { loaderId: p.loaderId, held: [] };
  }

  /**
   * The root frame committed a new document: the list starts over with it.
   * Documents committed without a request of their own (back/forward cache,
   * about:blank) reset it too.
   */
  private commitNavigation(frame: { url: string; loaderId?: string }): void {
    const held = !frame.loaderId || this.pending?.loaderId === frame.loaderId ? (this.pending?.held ?? []) : [];
    this.pending = undefined;
    this.resources.clear();
    this.servedBy.clear();
    this.rewritten.clear();
    this.missed.clear();
    this.missedRules.clear();
    // The old document's subframes are gone (Chromium doesn't always say so); the new ones attach after this.
    for (const id of [...this.frameUrls.keys()]) if (id !== this.mainFrameId) this.frameUrls.delete(id);
    this.frameParents.clear();
    const iframeId = this.opts.iframe?.id;
    this.opts.emit({ type: 'navigated', url: frame.url, ...(iframeId ? { iframeId } : {}) });
    for (const tracked of held) {
      this.resources.set(tracked.entry.url, tracked);
      this.opts.emit({ type: 'resource', resource: tracked.entry });
    }
  }

  private onResponseReceived(p: {
    requestId: string;
    loaderId?: string;
    type?: string;
    frameId?: string;
    response: { url: string; status: number; mimeType: string };
  }): void {
    const url = p.response.url;
    // Overrides also answer fetch()/XHR requests: forget those too, not only listed kinds.
    const overrideId = this.servedBy.get(p.requestId);
    const upstreamHash = this.rewritten.get(p.requestId);
    this.servedBy.delete(p.requestId);
    this.rewritten.delete(p.requestId);
    if (!isKind(p.type) || UNLISTED_URL.test(url)) return;
    // While a navigation is pending, only its own document counts; it's listed when it commits.
    const heldForCommit = !!this.pending && p.loaderId === this.pending.loaderId;
    if (this.pending && !heldForCommit) return;
    if (!overrideId) this.reportIfMissed(url, p.type);
    this.reportRuleMissed(url, p.type, p.frameId);
    const frame = this.frameOf(p.frameId, p.type === DOCUMENT_KIND ? url : undefined);
    const existing = this.resources.get(url);
    // The same file loaded by the top frame and by an iframe is listed as the top frame's.
    if (existing && !existing.entry.frame && frame && existing.entry.overrideId === overrideId) return;
    const iframeId = this.opts.iframe?.id;
    const entry: ResourceEntry = {
      url,
      kind: p.type,
      mimeType: p.response.mimeType,
      status: p.response.status,
      ...(overrideId ? { overrideId } : {}),
      ...(frame ? { frame } : {}),
      ...(iframeId ? { iframeId } : {}),
    };
    const tracked: TrackedResource = { entry, requestId: p.requestId, frameId: p.frameId, loaderId: p.loaderId, upstreamHash };
    if (heldForCommit) {
      this.pending!.held.push(tracked);
      return;
    }
    this.resources.set(url, tracked);
    this.opts.emit({ type: 'resource', resource: entry });
  }

  /**
   * The iframe a resource was loaded in, or undefined for the top-level page.
   * `documentUrl` covers an iframe's own document, which is requested (and
   * reported) by its parent before this session knows the new frame.
   */
  private frameOf(frameId: string | undefined, documentUrl?: string): { url: string; depth: number } | undefined {
    const depth = this.frameDepth(frameId);
    if (depth === 0) return undefined;
    // A frame's new document arrives before the frame's cached URL is updated: use the document's own.
    return { url: documentUrl || (frameId && this.frameUrls.get(frameId)) || '', depth };
  }

  /** Nesting of a frame below this session's root frame (0 = the root frame itself). */
  private localDepth(frameId: string | undefined): number {
    let depth = 0;
    for (let id = frameId; id && id !== this.mainFrameId && depth < MAX_FRAME_DEPTH; id = this.frameParents.get(id)) depth++;
    return depth;
  }

  /**
   * An enabled override matched a file that arrived unmodified. Chromium has at
   * least one such gap (an out-of-process iframe navigating back to its
   * parent's site); telling the user to reload beats failing silently.
   */
  private reportIfMissed(url: string, resourceType: string): void {
    const override = this.findOverride(url, resourceType);
    if (!override) return;
    const key = `${override.id}${MISSED_KEY_SEPARATOR}${url}`;
    if (this.missed.has(key)) return;
    this.missed.add(key);
    this.opts.emit({ type: 'override-missed', overrideId: override.id, url });
  }

  /**
   * An enabled block rule matched a file that arrived anyway: a blocked request
   * never gets a response, so it was in flight before the rule, or Chromium had
   * an interception gap. The page's own document is never blocked, so never missed.
   */
  private reportRuleMissed(url: string, resourceType: ResourceKind, frameId: string | undefined): void {
    if (this.isPageDocument(resourceType, frameId)) return;
    const rule = findBlockRule(this.opts.getRules(), url, resourceType, this.matchers);
    if (!rule) return;
    const key = `${rule.id}${MISSED_KEY_SEPARATOR}${url}`;
    if (this.missedRules.has(key)) return;
    this.missedRules.add(key);
    this.opts.emit({ type: 'rule-missed', ruleId: rule.id, url });
  }
}
