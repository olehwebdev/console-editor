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
}

interface TrackedResource {
  entry: ResourceEntry;
  requestId: string;
  frameId?: string;
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
  private readonly disposers: Array<() => void> = [];
  private mainFrameId: string | undefined;
  private fetchEnabled = false;
  /** Identifier of the injected SRI guard script, while installed. */
  private sriGuardId: string | undefined;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly opts: EngineOptions) {}

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on('Fetch.requestPaused', (p: RequestPausedParams) => void this.onRequestPaused(p)),
      this.cdp.on('Network.requestWillBeSent', (p) => this.onRequestWillBeSent(p)),
      this.cdp.on('Network.responseReceived', (p) => this.onResponseReceived(p)),
      this.cdp.on('Page.frameNavigated', (p) => {
        if (!p.frame.parentId) this.mainFrameId = p.frame.id;
      }),
    );
    await this.cdp.send('Page.enable');
    const tree = await this.cdp.send<{ frameTree: { frame: { id: string } } }>('Page.getFrameTree');
    this.mainFrameId = tree.frameTree.frame.id;
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
        return { url, content, hash: sha256(content) };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  /** Finds the enabled override for a URL. Exact beats glob beats regex; newer beats older. */
  findOverride(url: string): Override | undefined {
    let best: Override | undefined;
    for (const o of this.opts.getOverrides()) {
      if (!o.enabled || !this.matcherFor(o)(url)) continue;
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
      const override = this.findOverride(p.request.url);
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
      this.opts.emit({ type: 'error', message: `Interception failed for ${p.request.url}: ${(err as Error).message}` });
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
    this.resources.clear();
    this.servedBy.clear();
    this.opts.emit({ type: 'navigated', url: p.request.url });
  }

  private onResponseReceived(p: {
    requestId: string;
    type?: string;
    frameId?: string;
    response: { url: string; status: number; mimeType: string };
  }): void {
    const url = p.response.url;
    if (!isKind(p.type) || /^(data|blob|about|chrome|devtools):/.test(url)) return;
    const overrideId = this.servedBy.get(p.requestId);
    this.servedBy.delete(p.requestId);
    const entry: ResourceEntry = {
      url,
      kind: p.type,
      mimeType: p.response.mimeType,
      status: p.response.status,
      ...(overrideId ? { overrideId } : {}),
    };
    this.resources.set(url, { entry, requestId: p.requestId, frameId: p.frameId });
    this.opts.emit({ type: 'resource', resource: entry });
  }
}
