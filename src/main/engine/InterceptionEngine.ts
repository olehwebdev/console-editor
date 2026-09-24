import { createHash } from 'node:crypto';
import type { EngineEvent, Override, ResourceContent, ResourceEntry, ResourceKind, Settings } from '../../shared/types';
import { RESOURCE_KINDS } from '../../shared/types';
import type { CdpTransport } from './cdp';
import { compileMatcher, toCdpUrlPattern, type UrlPredicate } from '../../shared/matcher';
import {
  buildOverrideHeaders,
  buildRewrittenHeaders,
  decodeBody,
  headerValue,
  isRedirect,
  SRI_GUARD_SOURCE,
  stripIntegrityAttributes,
  stripSourceMapComments,
  type HeaderEntry,
} from './transform';

export interface FetchPattern {
  urlPattern: string;
  resourceType?: string;
  requestStage: 'Request' | 'Response';
}

export interface EngineOptions {
  transport: CdpTransport;
  /** Current overrides (with content). Called on every intercepted request. */
  getOverrides(): Override[];
  getSettings(): Settings;
  emit(event: EngineEvent): void;
  /** Fetches a URL outside the page (used when the page no longer holds a body). */
  fallbackFetch?(url: string): Promise<string>;
  /**
   * Set for engines attached to a cross-site iframe session: `id` is stamped on
   * its resources and `navigated` events so the UI can scope them to that
   * session, `depth` is the iframe's nesting depth (1 = direct child of the page).
   */
  iframe?: { id: string; depth: number };
}

interface TrackedResource {
  entry: ResourceEntry;
  requestId: string;
  frameId?: string;
  loaderId?: string;
}

/** Subset of `Fetch.requestPaused` params that we use. */
interface RequestPausedParams {
  requestId: string;
  request: { url: string; method: string };
  resourceType: string;
  networkId?: string;
  responseStatusCode?: number;
  responseErrorReason?: string;
  responseHeaders?: HeaderEntry[];
}

/** Errors that only mean the request's frame or session is gone (navigated away, removed, detached). */
export function isBenignCdpError(err: unknown): boolean {
  return /session .* is gone|Session with given id not found|No session with given id|session detached|target closed|Invalid InterceptionId|Inspected target navigated or closed/i.test(
    String((err as Error)?.message ?? err),
  );
}

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function isKind(type: string | undefined): type is ResourceKind {
  return !!type && (RESOURCE_KINDS as readonly string[]).includes(type);
}

const MATCH_RANK = { exact: 0, glob: 1, regex: 2 } as const;

/**
 * Pauses only the requests that an override (or SRI stripping) could apply to.
 * Exact/glob overrides get a precise URL pattern; regex overrides fall back to
 * "every request of this resource type".
 */
export function computeFetchPatterns(overrides: Override[], settings: Settings): FetchPattern[] {
  const patterns = new Map<string, FetchPattern>();
  const add = (p: FetchPattern) => patterns.set(`${p.urlPattern}|${p.resourceType ?? ''}`, p);
  const enabled = overrides.filter((o) => o.enabled);
  for (const o of enabled) {
    const urlPattern = toCdpUrlPattern(o.match);
    add({ urlPattern, resourceType: urlPattern === '*' ? o.kind : undefined, requestStage: 'Response' });
  }
  if (settings.stripIntegrity && enabled.some((o) => o.kind !== 'Document')) {
    add({ urlPattern: '*', resourceType: 'Document', requestStage: 'Response' });
  }
  return [...patterns.values()];
}

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
  /** Network requestId -> id of the override that served it. */
  private readonly servedBy = new Map<string, string>();
  private readonly matcherCache = new Map<string, UrlPredicate>();
  /** Frame id -> document URL for every frame this session knows about. */
  private readonly frameUrls = new Map<string, string>();
  /** Frame id -> parent frame id, to compute iframe depth. */
  private readonly frameParents = new Map<string, string>();
  /** `${overrideId}|${url}` already reported as missed since the last navigation. */
  private readonly missed = new Set<string>();
  /**
   * Hash of the raw upstream body of documents we rewrote (SRI stripped). The
   * page, and so `Network.getResponseBody`, only ever saw the rewritten HTML.
   */
  private readonly upstreamHashes = new Map<string, string>();
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

  constructor(private readonly opts: EngineOptions) {
    this.baseDepth = opts.iframe?.depth ?? 0;
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on('Fetch.requestPaused', (p: RequestPausedParams) => void this.onRequestPaused(p)),
      this.cdp.on('Network.requestWillBeSent', (p) => this.onRequestWillBeSent(p)),
      this.cdp.on('Network.responseReceived', (p) => this.onResponseReceived(p)),
      this.cdp.on('Page.frameNavigated', (p: { frame: { id: string; parentId?: string; url: string; loaderId?: string } }) => {
        this.frameUrls.set(p.frame.id, p.frame.url);
        // An iframe session's root frame has a (cross-process) parentId; it stays the root.
        if (p.frame.parentId && p.frame.id !== this.mainFrameId) this.frameParents.set(p.frame.id, p.frame.parentId);
        if (!p.frame.parentId && !this.opts.iframe) this.mainFrameId = p.frame.id;
        if (p.frame.id === this.mainFrameId) this.commitNavigation(p.frame);
      }),
      this.cdp.on('Page.frameStoppedLoading', (p: { frameId: string }) => {
        // Stopped without committing (download, 204, cancelled): the old page stays, and so does its list.
        if (p.frameId === this.mainFrameId && this.pending) this.pending = undefined;
      }),
      this.cdp.on('Page.frameAttached', (p: { frameId: string; parentFrameId?: string }) => {
        if (p.parentFrameId) this.frameParents.set(p.frameId, p.parentFrameId);
      }),
      this.cdp.on('Page.frameDetached', (p: { frameId: string }) => this.frameUrls.delete(p.frameId)),
    );
    await this.cdp.send('Page.enable');
    const tree = await this.cdp.send<{ frameTree: FrameTree }>('Page.getFrameTree');
    this.mainFrameId = tree.frameTree.frame.id;
    this.rootParentFrameId = tree.frameTree.frame.parentId;
    this.rememberFrames(tree.frameTree);
    await this.cdp.send('Network.enable', {
      maxTotalBufferSize: 256 * 1024 * 1024,
      maxResourceBufferSize: 64 * 1024 * 1024,
    });
    await this.applySettings();
  }

  detach(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    if (this.fetchEnabled) {
      this.fetchEnabled = false;
      this.cdp.send('Fetch.disable').catch(() => undefined);
    }
  }

  /** Re-applies settings (cache, service workers, CSP) and interception patterns. */
  applySettings(): Promise<void> {
    return this.serialize(async () => {
      const s = this.opts.getSettings();
      await this.cdp.send('Network.setCacheDisabled', { cacheDisabled: s.disableCache });
      await this.cdp.send('Network.setBypassServiceWorker', { bypass: s.bypassServiceWorker });
      await this.cdp.send('Page.setBypassCSP', { enabled: s.bypassCSP });
      if (s.stripIntegrity && !this.sriGuardId) {
        const r = await this.cdp.send<{ identifier: string }>('Page.addScriptToEvaluateOnNewDocument', { source: SRI_GUARD_SOURCE });
        this.sriGuardId = r.identifier;
      } else if (!s.stripIntegrity && this.sriGuardId) {
        await this.cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.sriGuardId });
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

  /** Raw upstream hash of a document this engine rewrote (SRI stripped), if any. */
  upstreamHashOf(url: string): string | undefined {
    return this.upstreamHashes.get(url);
  }

  /** The request id and frame of a listed resource (for reading its body through another session). */
  trackedResource(url: string): { requestId: string; frameId?: string; mimeType: string } | undefined {
    const r = this.resources.get(url);
    return r && { requestId: r.requestId, frameId: r.frameId, mimeType: r.entry.mimeType };
  }

  /** Reads a response body from this session by network request id. */
  async readNetworkBody(url: string, requestId: string, mimeType?: string): Promise<ResourceContent> {
    const r = await this.cdp.send<{ body: string; base64Encoded: boolean }>('Network.getResponseBody', { requestId });
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
    if (tracked && !tracked.entry.overrideId) {
      attempts.push(async () => {
        const r = await this.cdp.send<{ body: string; base64Encoded: boolean }>('Network.getResponseBody', {
          requestId: tracked.requestId,
        });
        return decodeBody(r.body, r.base64Encoded, tracked.entry.mimeType);
      });
      if (tracked.frameId) {
        const frameId = tracked.frameId;
        attempts.push(async () => {
          const r = await this.cdp.send<{ content: string; base64Encoded: boolean }>('Page.getResourceContent', {
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
        return { url, content, hash: this.upstreamHashes.get(url) ?? sha256(content) };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  /**
   * Finds the enabled override for a URL. Exact beats glob beats regex; newer
   * beats older. With a `resourceType`, HTML overrides only answer documents and
   * script/style overrides never do (so a broad pattern can't replace a page).
   */
  findOverride(url: string, resourceType?: string): Override | undefined {
    let best: Override | undefined;
    for (const o of this.opts.getOverrides()) {
      if (!o.enabled || !this.matcherFor(o)(url)) continue;
      if (resourceType && (resourceType === 'Document') !== (o.kind === 'Document')) continue;
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
    const key = `${o.id}\u0000${o.match.type}\u0000${o.match.ignoreQuery}\u0000${o.match.pattern}`;
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
    this.matcherCache.clear();
    const patterns = computeFetchPatterns(this.opts.getOverrides(), this.opts.getSettings());
    if (patterns.length === 0) {
      if (this.fetchEnabled) {
        await this.cdp.send('Fetch.disable');
        this.fetchEnabled = false;
      }
      return;
    }
    await this.cdp.send('Fetch.enable', { patterns });
    this.fetchEnabled = true;
  }

  private async onRequestPaused(p: RequestPausedParams): Promise<void> {
    try {
      const override = this.findOverride(p.request.url, p.resourceType);
      if (override && !isRedirect(p.responseStatusCode, p.responseHeaders)) {
        await this.serveOverride(p, override);
        return;
      }
      if (
        p.resourceType === 'Document' &&
        this.opts.getSettings().stripIntegrity &&
        !p.responseErrorReason &&
        p.responseStatusCode !== undefined &&
        p.responseStatusCode >= 200 &&
        p.responseStatusCode < 300 &&
        (headerValue(p.responseHeaders, 'content-type') ?? 'text/html').includes('html')
      ) {
        if (await this.serveWithoutIntegrity(p)) return;
      }
      await this.continue(p.requestId);
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
      !p.responseErrorReason && p.responseStatusCode !== undefined && p.responseStatusCode >= 200 && p.responseStatusCode < 300;

    if (override.originalHash && upstreamOk) {
      const upstream = await this.readPausedBody(p);
      if (upstream !== undefined && sha256(upstream) !== override.originalHash) {
        this.opts.emit({ type: 'upstream-changed', overrideId: override.id, url: p.request.url });
      }
    }

    let body = override.content;
    if (override.kind === 'Document') {
      if (settings.stripIntegrity) body = stripIntegrityAttributes(body).html;
    } else if (settings.stripSourceMaps) {
      body = stripSourceMapComments(body);
    }

    if (p.networkId) this.servedBy.set(p.networkId, override.id);
    // An override also answers requests whose upstream failed (404, 500, offline).
    await this.cdp.send('Fetch.fulfillRequest', {
      requestId: p.requestId,
      responseCode: 200,
      responseHeaders: buildOverrideHeaders(p.responseHeaders, override.kind, settings),
      body: Buffer.from(body, 'utf8').toString('base64'),
    });
    this.opts.emit({ type: 'override-served', overrideId: override.id, url: p.request.url });
  }

  /** Strips SRI attributes from an HTML document. Returns false when nothing needed changing. */
  private async serveWithoutIntegrity(p: RequestPausedParams): Promise<boolean> {
    const html = await this.readPausedBody(p);
    if (html === undefined) return false;
    const stripped = stripIntegrityAttributes(html);
    if (stripped.count === 0) return false;
    this.upstreamHashes.set(p.request.url, sha256(html));
    await this.cdp.send('Fetch.fulfillRequest', {
      requestId: p.requestId,
      responseCode: p.responseStatusCode,
      responseHeaders: buildRewrittenHeaders(p.responseHeaders, 'text/html'),
      body: Buffer.from(stripped.html, 'utf8').toString('base64'),
    });
    return true;
  }

  private async readPausedBody(p: RequestPausedParams): Promise<string | undefined> {
    try {
      const r = await this.cdp.send<{ body: string; base64Encoded: boolean }>('Fetch.getResponseBody', {
        requestId: p.requestId,
      });
      return decodeBody(r.body, r.base64Encoded, headerValue(p.responseHeaders, 'content-type'));
    } catch {
      return undefined;
    }
  }

  private async continue(requestId: string): Promise<void> {
    try {
      await this.cdp.send('Fetch.continueRequest', { requestId });
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
      p.type === 'Document' && p.requestId === p.loaderId && (!this.mainFrameId || p.frameId === this.mainFrameId);
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
    this.missed.clear();
    const keep = new Set(held.map((r) => r.entry.url));
    for (const url of [...this.upstreamHashes.keys()]) if (!keep.has(url)) this.upstreamHashes.delete(url);
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
    if (!isKind(p.type) || /^(data|blob|about|chrome|devtools):/.test(url)) return;
    const overrideId = this.servedBy.get(p.requestId);
    this.servedBy.delete(p.requestId);
    // While a navigation is pending, only its own document counts; it's listed when it commits.
    const heldForCommit = !!this.pending && p.loaderId === this.pending.loaderId;
    if (this.pending && !heldForCommit) return;
    if (!overrideId) this.reportIfMissed(url, p.type);
    const frame = this.frameOf(p.frameId, p.type === 'Document' ? url : undefined);
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
    const tracked: TrackedResource = { entry, requestId: p.requestId, frameId: p.frameId, loaderId: p.loaderId };
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
    for (let id = frameId; id && id !== this.mainFrameId && depth < 32; id = this.frameParents.get(id)) depth++;
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
    const key = `${override.id}|${url}`;
    if (this.missed.has(key)) return;
    this.missed.add(key);
    this.opts.emit({ type: 'override-missed', overrideId: override.id, url });
  }
}

interface FrameTree {
  frame: { id: string; url: string; parentId?: string };
  childFrames?: FrameTree[];
}
