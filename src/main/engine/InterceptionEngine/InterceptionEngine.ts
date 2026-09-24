import type { Override, ResourceContent, ResourceEntry } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { FrameTracker } from './FrameTracker';
import { NavigationTracker } from './NavigationTracker';
import { networkBody } from './networkBody';
import { OverrideMatcher } from './OverrideMatcher';
import { PausedRequestHandler } from './PausedRequestHandler';
import { readResourceContent } from './readResourceContent';
import { ResourceTracker } from './ResourceTracker';
import { SettingsApplier } from './SettingsApplier';
import { sha256 } from './sha256';
import type { EngineOptions, FrameTree, NavigatedFrame } from './types';

/** How much response data Chromium keeps for `Network.getResponseBody`, in all and per response. */
const MAX_TOTAL_BUFFER_BYTES = 256 * 1024 * 1024;
const MAX_RESOURCE_BUFFER_BYTES = 64 * 1024 * 1024;

/**
 * Serves edited files in place of the originals by driving the Chrome DevTools
 * Protocol `Fetch` domain, and keeps a list of the page's scripts, stylesheets
 * and documents via the `Network` domain.
 *
 * The engine only needs a {@link CdpTransport}, so the same code drives an
 * Electron `webContents.debugger`, an external Chrome, or a test double.
 */
export class InterceptionEngine {
  private readonly frames: FrameTracker;
  private readonly navigation: NavigationTracker;
  private readonly matcher: OverrideMatcher;
  private readonly resources: ResourceTracker;
  private readonly requests: PausedRequestHandler;
  private readonly settings: SettingsApplier;
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly opts: EngineOptions) {
    this.frames = new FrameTracker(opts.iframe?.depth ?? 0, !!opts.iframe);
    this.navigation = new NavigationTracker(this.frames);
    this.matcher = new OverrideMatcher(opts);
    this.resources = new ResourceTracker({ frames: this.frames, navigation: this.navigation, matcher: this.matcher, opts });
    this.requests = new PausedRequestHandler({ cdp: opts.transport, opts, matcher: this.matcher, resources: this.resources });
    this.settings = new SettingsApplier(opts.transport, opts, this.matcher);
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on(CDP.Fetch.requestPaused, (p) => void this.requests.handle(p)),
      this.cdp.on(CDP.Network.requestWillBeSent, (p) => this.navigation.requested(p)),
      this.cdp.on(CDP.Network.responseReceived, (p) => this.resources.responded(p)),
      this.cdp.on(CDP.Page.frameNavigated, (p: { frame: NavigatedFrame }) => {
        if (this.frames.navigated(p.frame)) this.commitNavigation(p.frame);
      }),
      this.cdp.on(CDP.Page.frameStoppedLoading, (p: { frameId: string }) => this.navigation.stopped(p.frameId)),
      this.cdp.on(CDP.Page.frameAttached, (p) => this.frames.attached(p)),
      this.cdp.on(CDP.Page.frameDetached, (p) => this.frames.detached(p)),
    );
    await this.cdp.send(CDP.Page.enable);
    const tree = await this.cdp.send<{ frameTree: FrameTree }>(CDP.Page.getFrameTree);
    this.frames.seed(tree.frameTree);
    await this.cdp.send(CDP.Network.enable, { maxTotalBufferSize: MAX_TOTAL_BUFFER_BYTES, maxResourceBufferSize: MAX_RESOURCE_BUFFER_BYTES });
    await this.applySettings();
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

  /** For an iframe session: the frame (in the parent's session) that contains its root frame. */
  get parentFrameId(): string | undefined {
    return this.frames.parentFrameId;
  }

  /** Nesting depth of a frame of this session (0 = the top-level page). */
  frameDepth(frameId: string | undefined): number {
    return this.frames.depth(frameId);
  }

  /** Corrects this iframe session's depth once its position in the parent is known. */
  setBaseDepth(depth: number): void {
    this.frames.setBaseDepth(depth);
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
    const content = await networkBody(this.cdp, requestId, mimeType);
    return { url, content, hash: sha256(content) };
  }

  /** The upstream content of a resource the page loaded (see {@link readResourceContent}). */
  getResourceContent(url: string): Promise<ResourceContent> {
    return readResourceContent(this.cdp, url, this.resources.get(url), this.opts.fallbackFetch);
  }

  /** The enabled override that answers a URL (see {@link OverrideMatcher.find}). */
  findOverride(url: string, resourceType?: string): Override | undefined {
    return this.matcher.find(url, resourceType);
  }

  /**
   * The root frame committed a new document: the list starts over with it.
   * Documents committed without a request of their own (back/forward cache,
   * about:blank) reset it too.
   */
  private commitNavigation(frame: NavigatedFrame): void {
    const held = this.navigation.commit(frame.loaderId);
    this.resources.clear();
    // The old document's subframes are gone (Chromium doesn't always say so); the new ones attach after this.
    this.frames.forgetSubframes();
    const iframeId = this.opts.iframe?.id;
    this.opts.emit({ type: 'navigated', url: frame.url, ...(iframeId ? { iframeId } : {}) });
    for (const tracked of held) this.resources.add(tracked);
  }
}
