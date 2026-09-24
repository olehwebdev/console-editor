import type { ResourceEntry } from '../../../shared/types';
import { DOCUMENT_KIND } from './constants';
import { isKind } from './isKind';
import { MissedOverrides } from './MissedOverrides';
import type { ResourceTrackerContext, ResponseReceivedParams, TrackedResource } from './types';

/** URLs never listed: they name no file that could be overridden. */
const UNLISTED_URL = /^(data|blob|about|chrome|devtools):/;

/**
 * The scripts, stylesheets and documents of the session's current page, from
 * `Network.responseReceived`, with what the engine did to the requests behind them.
 */
export class ResourceTracker {
  private readonly resources = new Map<string, TrackedResource>();
  /** Network requestId -> id of the override that served it. */
  private readonly servedBy = new Map<string, string>();
  /**
   * Network requestId -> hash of the raw upstream body of a document we
   * rewrote (SRI stripped), until its response is tracked. The page, and so
   * `Network.getResponseBody`, only ever saw the rewritten HTML.
   */
  private readonly rewritten = new Map<string, string>();
  private readonly missed: MissedOverrides;

  constructor(private readonly ctx: ResourceTrackerContext) {
    this.missed = new MissedOverrides(ctx.matcher, ctx.opts);
  }

  list(): ResourceEntry[] {
    return [...this.resources.values()].map((r) => r.entry);
  }

  has(url: string): boolean {
    return this.resources.has(url);
  }

  get(url: string): TrackedResource | undefined {
    return this.resources.get(url);
  }

  /** An override answered this network request. */
  markServed(networkId: string, overrideId: string): void {
    this.servedBy.set(networkId, overrideId);
  }

  /** This network request's document was rewritten; `upstreamHash` is its raw body's. */
  markRewritten(networkId: string, upstreamHash: string): void {
    this.rewritten.set(networkId, upstreamHash);
  }

  /** Forgets everything: the root frame committed a new document. */
  clear(): void {
    this.resources.clear();
    this.servedBy.clear();
    this.rewritten.clear();
    this.missed.clear();
  }

  /** Lists a resource and reports it. */
  add(tracked: TrackedResource): void {
    this.resources.set(tracked.entry.url, tracked);
    this.ctx.opts.emit({ type: 'resource', resource: tracked.entry });
  }

  responded(p: ResponseReceivedParams): void {
    const { navigation, frames, opts } = this.ctx;
    const url = p.response.url;
    // Overrides also answer fetch()/XHR requests: forget those too, not only listed kinds.
    const overrideId = this.servedBy.get(p.requestId);
    const upstreamHash = this.rewritten.get(p.requestId);
    this.servedBy.delete(p.requestId);
    this.rewritten.delete(p.requestId);
    if (!isKind(p.type) || UNLISTED_URL.test(url)) return;
    // While a navigation is pending, only its own document counts; it's listed when it commits.
    const heldForCommit = navigation.owns(p.loaderId);
    if (navigation.active && !heldForCommit) return;
    if (!overrideId) this.missed.report(url, p.type);
    const frame = frames.frameOf(p.frameId, p.type === DOCUMENT_KIND ? url : undefined);
    const existing = this.resources.get(url);
    // The same file loaded by the top frame and by an iframe is listed as the top frame's.
    if (existing && !existing.entry.frame && frame && existing.entry.overrideId === overrideId) return;
    const iframeId = opts.iframe?.id;
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
      navigation.hold(tracked);
      return;
    }
    this.add(tracked);
  }
}
