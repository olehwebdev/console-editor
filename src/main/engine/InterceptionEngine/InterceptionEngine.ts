import type { Override, ResourceContent, ResourceEntry } from '../../../shared/types';
import { CDP } from '../constants';
import { attachFrameSession } from './attachFrameSession';
import { attachWorkerSession } from './attachWorkerSession';
import { SCRIPT_KIND } from './constants';
import { FrameTracker } from './FrameTracker';
import { isServiceWorkerOutdated } from './isServiceWorkerOutdated';
import { NavigationTracker } from './NavigationTracker';
import { networkBody } from './networkBody';
import { OverrideMatcher } from './OverrideMatcher';
import { PausedRequestHandler } from './PausedRequestHandler';
import { readResourceContent } from './readResourceContent';
import { ResourceTracker } from './ResourceTracker';
import { SettingsApplier } from './SettingsApplier';
import { sha256 } from './sha256';
import type { EngineOptions, ServiceWorkerState, SessionSettings } from './types';
import { WorkerScripts } from './WorkerScripts';
import { WORKER_SESSIONS } from './workerSessions';
import { WorkerSettingsApplier } from './WorkerSettingsApplier';

/**
 * Serves edited files in place of the originals by driving the Chrome DevTools
 * Protocol `Fetch` domain, and keeps a list of the page's scripts, stylesheets
 * and documents (or its worker's scripts) via the `Network` domain.
 *
 * The engine only needs a `CdpTransport`, so the same code drives an
 * Electron `webContents.debugger`, an external Chrome, or a test double.
 */
export class InterceptionEngine {
  private readonly frames: FrameTracker;
  private readonly navigation: NavigationTracker;
  private readonly matcher: OverrideMatcher;
  private readonly resources: ResourceTracker;
  private readonly requests: PausedRequestHandler;
  private readonly settings: SessionSettings;
  /** Set on a worker session (`opts.worker`): the worker's own scripts, and its settings. */
  private readonly worker: WorkerScripts | undefined;
  private readonly workerSettings: WorkerSettingsApplier | undefined;
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly opts: EngineOptions) {
    this.frames = new FrameTracker(opts.iframe?.depth ?? 0, !!opts.iframe);
    this.navigation = new NavigationTracker(this.frames);
    this.matcher = new OverrideMatcher(opts);
    this.worker = opts.worker && new WorkerScripts(opts.worker);
    this.resources = new ResourceTracker({ frames: this.frames, navigation: this.navigation, matcher: this.matcher, opts, worker: this.worker });
    this.requests = new PausedRequestHandler({ cdp: opts.transport, opts, matcher: this.matcher, resources: this.resources, worker: this.worker });
    this.workerSettings = opts.worker && new WorkerSettingsApplier(opts.transport, opts, this.matcher, WORKER_SESSIONS[opts.worker.type]);
    this.settings = this.workerSettings ?? new SettingsApplier(opts.transport, opts, this.matcher);
  }

  /** Resolves once Fetch is enabled on this worker session (at once for sessions set up otherwise). */
  get fetchReady(): Promise<void> {
    return this.workerSettings?.fetchReady ?? Promise.resolve();
  }

  /**
   * Sets the session up. On a worker session every command is sent at once,
   * Fetch first, and nothing is awaited before returning control: a waiting
   * service or shared worker answers Network commands only once it runs, so
   * the caller resumes it right after this call, then awaits the result.
   */
  attach(): Promise<void> {
    const { opts, worker, workerSettings, resources, disposers } = this;
    const cdp = opts.transport;
    disposers.push(cdp.on(CDP.Network.responseReceived, (p) => resources.responded(p)));
    if (!worker || worker.hasFetch) disposers.push(cdp.on(CDP.Fetch.requestPaused, (p) => void this.requests.handle(p)));
    if (worker && workerSettings) return attachWorkerSession({ cdp, resources, worker, settings: workerSettings, disposers });
    return attachFrameSession({ cdp, frames: this.frames, navigation: this.navigation, resources, opts, disposers, applySettings: () => this.applySettings() });
  }

  detach(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    this.settings.stop();
  }

  /** Re-applies settings (cache, service workers, CSP) and interception patterns. */
  applySettings(): Promise<void> {
    return this.settings.apply();
  }

  /** Call after overrides were added, removed, enabled/disabled or re-matched. */
  refreshInterception(): Promise<void> {
    return this.settings.refresh();
  }

  listResources(): ResourceEntry[] {
    return this.resources.list();
  }

  hasResource(url: string): boolean {
    return this.resources.has(url);
  }

  /** Nesting depth of a frame of this session (0 = the top-level page). */
  frameDepth(frameId: string | undefined): number {
    return this.frames.depth(frameId);
  }

  /** For an iframe session: sets its depth from where its root frame sits among `parent`'s frames. */
  placeIn(parent: InterceptionEngine): void {
    // Depth counts frames, not sessions: this iframe may sit inside a same-site iframe of its parent.
    const parentFrameId = this.frames.parentFrameId;
    if (parentFrameId) this.frames.setBaseDepth(parent.frameDepth(parentFrameId) + 1);
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
    const content = await networkBody(this.opts.transport, requestId, mimeType);
    return { url, content, hash: sha256(content) };
  }

  /** The upstream content of a resource the page loaded (see {@link readResourceContent}). */
  getResourceContent(url: string): Promise<ResourceContent> {
    return readResourceContent(this.opts.transport, url, this.resources.get(url), this.opts.fallbackFetch);
  }

  /** The enabled override that answers a URL (see {@link OverrideMatcher.find}). */
  findOverride(url: string, resourceType?: string): Override | undefined {
    return this.matcher.find(url, resourceType);
  }

  /** The version of the override that would serve `url` now (`id@updatedAt`), or '' for the live file. */
  overrideVersion(url: string, resourceType: string): string {
    return this.matcher.version(url, resourceType);
  }

  /** For a service worker: what this session knows, for its next one. */
  serviceWorkerState(): ServiceWorkerState | undefined {
    return this.worker?.state(this.resources.list().filter((entry) => entry.kind === SCRIPT_KIND));
  }

  /** For a service worker: whether it runs outdated code and must be reinstalled (see `isServiceWorkerOutdated`). */
  isOutdated(): boolean {
    const state = this.serviceWorkerState();
    return !!state && isServiceWorkerOutdated(state, this.opts.getOverrides(), (url, resourceType) => this.overrideVersion(url, resourceType));
  }
}
