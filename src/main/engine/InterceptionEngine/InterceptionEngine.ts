import { compileMatcher, type UrlPredicate } from '../../../shared/matcher';
import type { MatchType, MissedReason, Override, ResourceContent, ResourceEntry, ResourceKind } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import { CDP, CONTENT_TYPE, HTML_MIME_TYPE, HTTP_REDIRECTION, HTTP_SUCCESSFUL, TARGET_TYPE } from '../constants';
import {
  buildOverrideHeaders,
  buildRewrittenHeaders,
  decodeBody,
  defaultContentType,
  headerValue,
  isRedirect,
  SRI_GUARD_SOURCE,
  stripIntegrityAttributes,
  stripSourceMapComments,
} from '../transform';
import { answersKind } from './answersKind';
import { computeFetchPatterns } from './computeFetchPatterns';
import { ANY_URL, DOCUMENT_KIND, OTHER_RESOURCE_TYPE, SCRIPT_KIND } from './constants';
import { isBenignCdpError } from './isBenignCdpError';
import { isKind } from './isKind';
import { MISSED_REASONS } from './missedReasons';
import { originOf } from './originOf';
import { sha256 } from './sha256';
import type { CdpCommand, EngineOptions, FetchPattern, FrameTree, RequestPausedParams, ServedScript, ServiceWorkerState, TrackedResource } from './types';
import { WORKER_SESSIONS } from './workerSessions';

const MATCH_RANK = { exact: 0, glob: 1, regex: 2 } as const satisfies Record<MatchType, number>;

/** How much response data Chromium keeps for `Network.getResponseBody`, in all and per response. */
const MAX_TOTAL_BUFFER_BYTES = 256 * 1024 * 1024;
const MAX_RESOURCE_BUFFER_BYTES = 64 * 1024 * 1024;
/** `Network.enable`'s params on every session: buffers large enough to return big bundles. */
const NETWORK_BUFFERS = { maxTotalBufferSize: MAX_TOTAL_BUFFER_BYTES, maxResourceBufferSize: MAX_RESOURCE_BUFFER_BYTES };

/** An override answers with a success, whatever upstream said. */
const OVERRIDE_STATUS = 200;

/** The status a worker's first script is listed with when no response gave one: it started, so it loaded. */
const STARTED_SCRIPT_STATUS = 200;

/** Part of every HTML content type; a document whose type lacks it isn't rewritten. */
const HTML_TYPE_MARKER = 'html';

/** URLs never listed: they name no file that could be overridden. */
const UNLISTED_URL = /^(data|blob|about|chrome|devtools):/;

/** JavaScript MIME types (what `importScripts` in a worker gets). */
const JS_MIME = /^(text|application)\/(x-)?(javascript|ecmascript)|^text\/jscript/i;

/** `Page.frameDetached` reason of a frame that moved to another process. */
const SWAP_REASON = 'swap';

/** Bounds the walk up `frameParents`, which a stale entry could turn into a loop. */
const MAX_FRAME_DEPTH = 32;

/** Joins the parts of a matcher cache key: a NUL can't occur in them (a regex may contain `|`). */
const MATCHER_KEY_SEPARATOR = '\u0000';
/** Joins an override id and a URL into a `missed` key. */
const MISSED_KEY_SEPARATOR = '|';
/** Joins an override's id and save time into the version a service worker's script was served. */
const VERSION_SEPARATOR = '@';

/** The CDP resource types workers load scripts as. */
const WORKER_SCRIPT_TYPES = new Set<string>([SCRIPT_KIND, OTHER_RESOURCE_TYPE]);

/** Every script a worker whose session `pausesScripts` loads (see `WorkerSession`). */
const WORKER_SCRIPT_PATTERNS: FetchPattern[] = [
  { urlPattern: ANY_URL, resourceType: SCRIPT_KIND, requestStage: 'Response' },
  { urlPattern: ANY_URL, resourceType: OTHER_RESOURCE_TYPE, requestStage: 'Response' },
];

/**
 * Serves edited files in place of the originals by driving the Chrome DevTools
 * Protocol `Fetch` domain, and keeps a list of the page's scripts, stylesheets
 * and documents via the `Network` domain.
 *
 * The engine only needs a {@link CdpTransport}, so the same code drives an
 * Electron `webContents.debugger`, an external Chrome, or a test double.
 */
export class InterceptionEngine {
  private readonly resources = new Map<string, TrackedResource>();
  /** Network requestId -> id of the override that served it (shared with the page's other sessions). */
  private readonly servedBy: Map<string, string>;
  private readonly matcherCache = new Map<string, UrlPredicate>();
  /** Frame id -> document URL for every frame this session knows about. */
  private readonly frameUrls = new Map<string, string>();
  /** Frame id -> parent frame id, to compute iframe depth. */
  private readonly frameParents = new Map<string, string>();
  /** `${overrideId}|${url}` already reported as missed since the last navigation. */
  private readonly missed = new Set<string>();
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
  /** A worker's script URL, final once its main script's response arrives (redirects). */
  private workerUrl: string | undefined;
  /**
   * For a service worker: script URL -> how it was paused and the override
   * version it was served (`id@updatedAt`, '' for the live file), to tell when
   * it runs outdated code. Chromium keeps installed scripts and doesn't fetch
   * them again on reload.
   */
  private readonly servedScripts = new Map<string, ServedScript>();
  /** For a service worker: its main script was fetched on this session (installed through it). */
  private installSeen = false;
  /**
   * A worker's own first script: not seen, requested on this session, or
   * listed. Usually its `responseReceived` lists it; `loadingFinished` is the
   * fallback when none comes, and `Inspector.workerScriptLoaded` when the
   * session never fetched it (an installed service worker, or a shared worker
   * whose script its page fetched).
   */
  private mainScript: 'unseen' | 'requested' | 'listed' = 'unseen';
  /** Resolves once Fetch is enabled on this worker session (at once for sessions set up otherwise). */
  fetchReady: Promise<void> = Promise.resolve();

  constructor(private readonly opts: EngineOptions) {
    this.baseDepth = opts.iframe?.depth ?? 0;
    this.servedBy = opts.servedBy ?? new Map();
    this.workerUrl = opts.worker?.url;
    const previous = opts.worker?.previous;
    if (previous) {
      this.workerUrl = previous.url;
      this.installSeen = previous.installSeen;
      for (const [url, served] of previous.servedScripts) this.servedScripts.set(url, served);
    }
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  /** Whether this session has a Fetch domain: pages, iframes, service and shared workers. */
  private get hasFetch(): boolean {
    const worker = this.opts.worker;
    return !worker || WORKER_SESSIONS[worker.type].fetch;
  }

  /**
   * Sets the session up. On a worker session every command is sent at once,
   * Fetch first, and nothing is awaited before returning control: a waiting
   * service or shared worker answers Network commands only once it runs, so
   * the caller resumes it right after this call, then awaits the result.
   */
  attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on(CDP.Network.requestWillBeSent, (p) => this.onRequestWillBeSent(p)),
      this.cdp.on(CDP.Network.responseReceived, (p) => this.onResponseReceived(p)),
    );
    if (this.hasFetch) this.disposers.push(this.cdp.on(CDP.Fetch.requestPaused, (p: RequestPausedParams) => void this.onRequestPaused(p)));
    if (this.opts.worker) {
      this.disposers.push(
        this.cdp.on(CDP.Network.loadingFinished, (p: { requestId: string }) => {
          if (p.requestId === this.opts.worker?.targetId && this.mainScript !== 'listed') this.listMainScript(true);
        }),
        // Started from installed scripts (a service worker) or a script its page fetched (a shared worker).
        // (A worklet's target URL is its document's, not a script.)
        this.cdp.on(CDP.Inspector.workerScriptLoaded, () => {
          if (this.mainScript === 'unseen' && this.opts.worker?.type !== TARGET_TYPE.worklet) this.listMainScript(false);
        }),
      );
      this.relistPrevious();
      return this.attachWorker();
    }
    return this.attachFrame();
  }

  private attachWorker(): Promise<void> {
    const replies: Promise<unknown>[] = [];
    if (this.hasFetch) {
      this.fetchReady = this.enableFetch();
      replies.push(this.fetchReady);
    }
    replies.push(this.cdp.send(CDP.Network.enable, NETWORK_BUFFERS));
    for (const [method, params] of this.workerSettings()) replies.push(this.cdp.send(method, params));
    return Promise.all(replies).then(() => undefined);
  }

  /** A service worker attached again lists what it loaded before (its installed scripts aren't fetched again). */
  private relistPrevious(): void {
    const worker = this.opts.worker!;
    for (const script of worker.previous?.scripts ?? []) {
      const entry: ResourceEntry = { ...script, worker: { type: worker.type, url: this.workerUrl ?? worker.url }, workerId: worker.id };
      if (script.url === (this.workerUrl ?? worker.url)) this.mainScript = 'listed';
      // Its body is gone with the old session: reading it falls back to the out-of-page fetch.
      this.resources.set(entry.url, { entry, requestId: '' });
      this.opts.emit({ type: 'resource', resource: entry });
    }
  }

  /** For a service worker: what this session knows, for its next one. */
  serviceWorkerState(): ServiceWorkerState | undefined {
    const worker = this.opts.worker;
    if (worker?.type !== TARGET_TYPE.serviceWorker) return undefined;
    return {
      url: this.workerUrl ?? worker.url,
      installSeen: this.installSeen,
      servedScripts: new Map(this.servedScripts),
      scripts: [...this.resources.values()].filter((r) => r.entry.kind === SCRIPT_KIND).map((r) => r.entry),
    };
  }

  /** Network settings this worker's session takes: the page's don't reach what workers load. */
  private workerSettings(): CdpCommand[] {
    return WORKER_SESSIONS[this.opts.worker!.type].settings(this.opts.getSettings());
  }

  private async attachFrame(): Promise<void> {
    this.disposers.push(
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
    await this.cdp.send(CDP.Network.enable, NETWORK_BUFFERS);
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
      if (this.opts.worker) {
        // Not awaited: a stopped service worker answers Network commands only once it runs again.
        for (const [method, params] of this.workerSettings()) this.cdp.send(method, params).catch(() => undefined);
        await this.updatePatterns();
        return;
      }
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

  /** Call after overrides were added, removed, enabled/disabled or re-matched. */
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
   * copy for the original.
   */
  async getResourceContent(url: string): Promise<ResourceContent> {
    const tracked = this.resources.get(url);
    const attempts: Array<() => Promise<string>> = [];
    // What the page got may be an override either way when a service worker answered it.
    if (tracked && !tracked.entry.overrideId && !tracked.fromServiceWorker) {
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
   * put JS in a stylesheet or replace a page); `Other` (mostly what workers
   * load as scripts) by script overrides; other requests (fetch, XHR,
   * preload) by script and style overrides.
   */
  findOverride(url: string, resourceType?: string): Override | undefined {
    let best: Override | undefined;
    for (const o of this.opts.getOverrides()) {
      if (!o.enabled || !this.matcherFor(o)(url)) continue;
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

  private matcherFor(o: Override): UrlPredicate {
    const key = [o.id, o.match.type, o.match.ignoreQuery, o.match.pattern].join(MATCHER_KEY_SEPARATOR);
    let predicate = this.matcherCache.get(key);
    if (!predicate) {
      predicate = compileMatcher(o.match);
      this.matcherCache.set(key, predicate);
    }
    return predicate;
  }

  private serialize(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async updatePatterns(): Promise<void> {
    if (this.opts.worker) {
      if (this.hasFetch) await this.enableFetch();
      return;
    }
    this.matcherCache.clear();
    const patterns = computeFetchPatterns(this.opts.getOverrides(), this.opts.getSettings());
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

  /**
   * Enables Fetch on a worker session; sent at once (not queued). Never
   * disabled while the worker lives: a shared worker whose session had Fetch
   * off (or no patterns) is never paused again. Its scripts' patterns keep the
   * list from ever being empty.
   */
  private enableFetch(): Promise<void> {
    this.matcherCache.clear();
    const patterns = computeFetchPatterns(this.opts.getOverrides(), this.opts.getSettings());
    const has = (p: FetchPattern) => patterns.some((q) => q.urlPattern === p.urlPattern && q.resourceType === p.resourceType);
    patterns.push(...WORKER_SCRIPT_PATTERNS.filter((p) => !has(p)));
    this.fetchEnabled = true;
    return this.cdp.send(CDP.Fetch.enable, { patterns }).then(() => undefined);
  }

  /**
   * For a service worker: whether it runs code other than what would be
   * served now (an override of one of its scripts was added, changed or turned
   * off since it was installed). Chromium doesn't fetch installed scripts on
   * reload, so it must be reinstalled. One installed before this session
   * attached (in an earlier run, say) may run edits of any of its site's
   * scripts, and which it imported is unknown: it counts as outdated while
   * its site has script overrides, so it's reinstalled once, through
   * interception.
   */
  isOutdated(): boolean {
    const worker = this.opts.worker;
    if (worker?.type !== TARGET_TYPE.serviceWorker) return false;
    if (!this.installSeen) {
      const origin = originOf(this.workerUrl ?? worker.url);
      return this.opts.getOverrides().some((o) => o.kind === SCRIPT_KIND && originOf(o.sourceUrl) === origin);
    }
    const scripts = [...this.resources.values()].filter((r) => r.entry.kind === SCRIPT_KIND).map((r) => r.entry.url);
    return scripts.some((url) => {
      const served = this.servedScripts.get(url);
      return this.overrideVersion(url, served?.resourceType ?? SCRIPT_KIND) !== (served?.version ?? '');
    });
  }

  private overrideVersion(url: string, resourceType: string): string {
    const o = this.findOverride(url, resourceType);
    return o ? `${o.id}${VERSION_SEPARATOR}${o.updatedAt}` : '';
  }

  private async onRequestPaused(p: RequestPausedParams): Promise<void> {
    try {
      const type = this.opts.worker?.type;
      const workerScript = WORKER_SCRIPT_TYPES.has(p.resourceType);
      // A shared worker's first script is paused on its creator's session; it must not start before
      // the worker's own session intercepts.
      if (p.resourceType === OTHER_RESOURCE_TYPE && !this.opts.worker) await this.opts.workerSetups?.();
      // With the page bypassing service workers, a service worker's other requests are its own fetches (a
      // precache, say): an edit served there would be stored in its caches and outlive the override.
      if (type === TARGET_TYPE.serviceWorker && this.opts.getSettings().bypassServiceWorker && !workerScript) {
        await this.continue(p.requestId);
        return;
      }
      const override = this.findOverride(p.request.url, p.resourceType);
      if (type === TARGET_TYPE.serviceWorker && workerScript) {
        this.servedScripts.set(p.request.url, { resourceType: p.resourceType, version: this.overrideVersion(p.request.url, p.resourceType) });
        // Its own script, paused here: installed through this session, whatever it reports.
        if (this.isOwnScript(p.request.url, p.resourceType)) this.installSeen = true;
      }
      const listed = !!type && WORKER_SESSIONS[type].pausesScripts && workerScript;
      if (override && !isRedirect(p.responseStatusCode, p.responseHeaders)) {
        await this.serveOverride(p, override);
        if (listed) this.listPaused(p, override.id);
        return;
      }
      if (
        p.resourceType === DOCUMENT_KIND &&
        this.opts.getSettings().stripIntegrity &&
        !p.responseErrorReason &&
        p.responseStatusCode !== undefined &&
        p.responseStatusCode >= HTTP_SUCCESSFUL &&
        p.responseStatusCode < HTTP_REDIRECTION &&
        (headerValue(p.responseHeaders, CONTENT_TYPE) ?? HTML_MIME_TYPE).includes(HTML_TYPE_MARKER)
      ) {
        if (await this.serveWithoutIntegrity(p)) return;
      }
      await this.continue(p.requestId);
      if (listed && !isRedirect(p.responseStatusCode, p.responseHeaders)) this.listPaused(p);
    } catch (err) {
      // A frame or session that went away mid-request isn't the user's problem.
      if (!isBenignCdpError(err)) {
        this.opts.emit({ type: 'error', message: `Interception failed for ${p.request.url}: ${(err as Error).message}` });
      }
      await this.continue(p.requestId);
    }
  }

  private async serveOverride(p: RequestPausedParams, override: Override): Promise<void> {
    const settings = this.opts.getSettings();
    const upstreamOk =
      !p.responseErrorReason &&
      p.responseStatusCode !== undefined &&
      p.responseStatusCode >= HTTP_SUCCESSFUL &&
      p.responseStatusCode < HTTP_REDIRECTION;

    if (override.originalHash && upstreamOk) {
      const upstream = await this.readPausedBody(p);
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

    // A new service worker version may fetch its script before its session reports anything (no networkId);
    // that script is reported under the worker's id.
    const worker = this.opts.worker;
    const reportedAs = p.networkId ?? (worker && this.isOwnScript(p.request.url, p.resourceType) ? worker.targetId : undefined);
    // Recorded first: the response can be reported before the fulfil is answered.
    if (reportedAs) this.servedBy.set(reportedAs, override.id);
    try {
      // An override also answers requests whose upstream failed (404, 500, offline).
      await this.cdp.send(CDP.Fetch.fulfillRequest, {
        requestId: p.requestId,
        responseCode: OVERRIDE_STATUS,
        responseHeaders: buildOverrideHeaders(p.responseHeaders, override.kind, settings),
        body: Buffer.from(body, 'utf8').toString('base64'),
      });
    } catch (err) {
      if (reportedAs) this.servedBy.delete(reportedAs);
      throw err;
    }
    this.opts.emit({ type: 'override-served', overrideId: override.id, url: p.request.url });
  }

  /** Strips SRI attributes from an HTML document. Returns false when nothing needed changing. */
  private async serveWithoutIntegrity(p: RequestPausedParams): Promise<boolean> {
    const html = await this.readPausedBody(p);
    if (html === undefined) return false;
    const stripped = stripIntegrityAttributes(html);
    if (stripped.count === 0) return false;
    if (p.networkId) this.rewritten.set(p.networkId, sha256(html));
    await this.cdp.send(CDP.Fetch.fulfillRequest, {
      requestId: p.requestId,
      responseCode: p.responseStatusCode,
      responseHeaders: buildRewrittenHeaders(p.responseHeaders, HTML_MIME_TYPE),
      body: Buffer.from(stripped.html, 'utf8').toString('base64'),
    });
    return true;
  }

  private async readPausedBody(p: RequestPausedParams): Promise<string | undefined> {
    try {
      const r = await this.cdp.send<{ body: string; base64Encoded: boolean }>(CDP.Fetch.getResponseBody, {
        requestId: p.requestId,
      });
      return decodeBody(r.body, r.base64Encoded, headerValue(p.responseHeaders, CONTENT_TYPE));
    } catch {
      return undefined;
    }
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
    const worker = this.opts.worker;
    if (worker) {
      if (p.requestId !== worker.targetId || this.mainScript === 'listed') return;
      // Sent again, with the new URL, for each redirect.
      this.workerUrl = p.request.url;
      this.mainScript = 'requested';
      if (worker.type === TARGET_TYPE.serviceWorker) this.installSeen = true;
      return;
    }
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
    // Shared with the page's other sessions: only the page's own navigation ends them all.
    if (!this.opts.iframe) this.servedBy.clear();
    this.rewritten.clear();
    this.missed.clear();
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
    response: { url: string; status: number; mimeType: string; fromServiceWorker?: boolean };
  }): void {
    const url = p.response.url;
    // Overrides also answer fetch()/XHR requests: forget those too, not only listed kinds.
    const overrideId = this.servedBy.get(p.requestId);
    const upstreamHash = this.rewritten.get(p.requestId);
    this.servedBy.delete(p.requestId);
    this.rewritten.delete(p.requestId);
    const worker = this.opts.worker;
    const isMainScript = !!worker && p.requestId === worker.targetId;
    // Chromium's update check reports a new version's script under another request id, paused nowhere.
    const checkedScript =
      worker?.type === TARGET_TYPE.serviceWorker && !isMainScript && this.mainScript !== 'listed' && url === (this.workerUrl ?? worker.url);
    if (isMainScript || checkedScript) {
      this.workerUrl = url;
      this.mainScript = 'listed';
      if (worker.type === TARGET_TYPE.serviceWorker) this.installSeen = true;
    }
    const kind = this.kindOf(p.type, p.response.mimeType);
    if (!kind || UNLISTED_URL.test(url)) return;
    // While a navigation is pending, only its own document counts; it's listed when it commits.
    const heldForCommit = !!this.pending && p.loaderId === this.pending.loaderId;
    if (this.pending && !heldForCommit) return;
    // A service worker's answer was served (or not) on its own session, under another request id.
    if (!overrideId && !p.response.fromServiceWorker) this.reportIfMissed(url, kind, this.missedReason(url, isMainScript));
    const frame = this.frameOf(p.frameId, kind === DOCUMENT_KIND ? url : undefined);
    const existing = this.resources.get(url);
    // The same file loaded by the top frame and by an iframe is listed as the top frame's.
    if (existing && !existing.entry.frame && frame && existing.entry.overrideId === overrideId) return;
    const iframeId = this.opts.iframe?.id;
    const entry: ResourceEntry = {
      url,
      kind,
      mimeType: p.response.mimeType,
      status: p.response.status,
      ...(overrideId ? { overrideId } : {}),
      ...(frame ? { frame } : {}),
      ...(iframeId ? { iframeId } : {}),
      ...(worker ? { worker: { type: worker.type, url: this.workerUrl ?? worker.url }, workerId: worker.id } : {}),
    };
    const tracked: TrackedResource = {
      entry,
      requestId: p.requestId,
      frameId: p.frameId,
      loaderId: p.loaderId,
      upstreamHash,
      ...(p.response.fromServiceWorker ? { fromServiceWorker: true } : {}),
    };
    if (heldForCommit) {
      this.pending!.held.push(tracked);
      return;
    }
    this.resources.set(url, tracked);
    this.opts.emit({ type: 'resource', resource: entry });
  }

  /** Whether a request paused on this worker's session is the worker's own first script (paused as `Other`). */
  private isOwnScript(url: string, resourceType: string): boolean {
    const worker = this.opts.worker;
    return !!worker && resourceType === OTHER_RESOURCE_TYPE && url === (this.workerUrl ?? worker.url);
  }

  /** Lists a script a worker loaded from its pause, unless its session reported it. */
  private listPaused(p: RequestPausedParams, overrideId?: string): void {
    const url = p.request.url;
    if (this.isOwnScript(url, p.resourceType)) this.mainScript = 'listed';
    if (this.resources.has(url) || UNLISTED_URL.test(url)) return;
    if (!overrideId && (p.responseErrorReason || p.responseStatusCode === undefined)) return;
    const worker = this.opts.worker!;
    const mimeType = headerValue(p.responseHeaders, CONTENT_TYPE)?.split(';')[0].trim();
    const entry: ResourceEntry = {
      url,
      kind: SCRIPT_KIND,
      mimeType: (!overrideId && mimeType) || defaultContentType(SCRIPT_KIND),
      status: overrideId ? OVERRIDE_STATUS : p.responseStatusCode!,
      ...(overrideId ? { overrideId } : {}),
      worker: { type: worker.type, url: this.workerUrl ?? worker.url },
      workerId: worker.id,
    };
    this.resources.set(url, { entry, requestId: p.networkId ?? p.requestId });
    this.opts.emit({ type: 'resource', resource: entry });
  }

  /**
   * Lists a worker's first script without a `responseReceived`. `fetched`: it
   * came over the network on this session (so an enabled override should have
   * served it), rather than from installed scripts or its page.
   */
  private listMainScript(fetched: boolean): void {
    const worker = this.opts.worker!;
    this.mainScript = 'listed';
    const url = this.workerUrl ?? worker.url;
    const overrideId = this.servedBy.get(worker.targetId);
    this.servedBy.delete(worker.targetId);
    if (UNLISTED_URL.test(url)) return;
    if (fetched && !overrideId) this.reportIfMissed(url, OTHER_RESOURCE_TYPE, this.missedReason(url, true));
    const entry: ResourceEntry = {
      url,
      kind: SCRIPT_KIND,
      mimeType: defaultContentType(SCRIPT_KIND),
      status: STARTED_SCRIPT_STATUS,
      ...(overrideId ? { overrideId } : {}),
      worker: { type: worker.type, url },
      workerId: worker.id,
    };
    this.resources.set(url, { entry, requestId: worker.targetId });
    this.opts.emit({ type: 'resource', resource: entry });
  }

  /**
   * The kind a response is listed as. Workers load `importScripts` as type
   * `Other`, so there a JavaScript response of that type is a script; they
   * load no documents or stylesheets.
   */
  private kindOf(type: string | undefined, mimeType: string): ResourceKind | undefined {
    if (!this.opts.worker) return isKind(type) ? type : undefined;
    return type === SCRIPT_KIND || (type === OTHER_RESOURCE_TYPE && JS_MIME.test(mimeType)) ? SCRIPT_KIND : undefined;
  }

  /** Why a file a worker loaded wasn't served, when it's known. */
  private missedReason(url: string, isMainScript: boolean): MissedReason | undefined {
    const worker = this.opts.worker;
    if (!worker) return undefined;
    return MISSED_REASONS[worker.type]({ nested: !!worker.nested, mainScript: isMainScript, pausedHere: this.servedScripts.has(url) });
  }

  /**
   * The iframe a resource was loaded in, or undefined for the top-level page.
   * `documentUrl` covers an iframe's own document, which is requested (and
   * reported) by its parent before this session knows the new frame.
   */
  private frameOf(frameId: string | undefined, documentUrl?: string): { url: string; depth: number } | undefined {
    // A worker session knows no frames; its entries are labelled with the worker.
    if (this.opts.worker) return undefined;
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
  private reportIfMissed(url: string, resourceType: string, reason?: MissedReason): void {
    const override = this.findOverride(url, resourceType);
    if (!override) return;
    const key = `${override.id}${MISSED_KEY_SEPARATOR}${url}`;
    if (this.missed.has(key)) return;
    this.missed.add(key);
    this.opts.emit({ type: 'override-missed', overrideId: override.id, url, ...(reason ? { reason } : {}) });
  }
}
