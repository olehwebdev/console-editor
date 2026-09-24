import type { MissedReason, ResourceEntry } from '../../../shared/types';
import { DOCUMENT_KIND, UNLISTED_URL } from './constants';
import { listedKind } from './listedKind';
import { MissedOverrides } from './MissedOverrides';
import type { ResourceTrackerContext, ResponseReceivedParams, TrackedResource } from './types';

/**
 * The scripts, stylesheets and documents of the session's current page (or
 * the scripts of its worker), from `Network.responseReceived`, with what the
 * engine did to the requests behind them.
 */
export class ResourceTracker {
  private readonly resources = new Map<string, TrackedResource>();
  /** Network requestId -> id of the override that served it (shared with the page's other sessions). */
  private readonly servedBy: Map<string, string>;
  /**
   * Network requestId -> hash of the raw upstream body of a document we
   * rewrote (SRI stripped), until its response is tracked. The page, and so
   * `Network.getResponseBody`, only ever saw the rewritten HTML.
   */
  private readonly rewritten = new Map<string, string>();
  private readonly missed: MissedOverrides;

  constructor(private readonly ctx: ResourceTrackerContext) {
    this.servedBy = ctx.opts.servedBy ?? new Map();
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

  /** The override's answer to this network request failed to go out. */
  unmarkServed(networkId: string): void {
    this.servedBy.delete(networkId);
  }

  /** The override that served this network request, if any, forgotten once taken. */
  takeServed(networkId: string): string | undefined {
    const overrideId = this.servedBy.get(networkId);
    this.servedBy.delete(networkId);
    return overrideId;
  }

  /** This network request's document was rewritten; `upstreamHash` is its raw body's. */
  markRewritten(networkId: string, upstreamHash: string): void {
    this.rewritten.set(networkId, upstreamHash);
  }

  /** Reports an enabled override that matched a file which arrived unmodified (see {@link MissedOverrides}). */
  reportMissed(url: string, resourceType: string, reason?: MissedReason): void {
    this.missed.report(url, resourceType, reason);
  }

  /** Forgets everything: the root frame committed a new document. */
  clear(): void {
    this.resources.clear();
    // Shared with the page's other sessions: only the page's own navigation ends them all.
    if (!this.ctx.opts.iframe) this.servedBy.clear();
    this.rewritten.clear();
    this.missed.clear();
  }

  /** Lists a resource and reports it. */
  add(tracked: TrackedResource): void {
    this.resources.set(tracked.entry.url, tracked);
    this.ctx.opts.emit({ type: 'resource', resource: tracked.entry });
  }

  responded(p: ResponseReceivedParams): void {
    const { navigation, frames, opts, worker } = this.ctx;
    const url = p.response.url;
    // Overrides also answer fetch()/XHR requests: forget those too, not only listed kinds.
    const overrideId = this.takeServed(p.requestId);
    const upstreamHash = this.rewritten.get(p.requestId);
    this.rewritten.delete(p.requestId);
    const isMainScript = !!worker && worker.responded(p.requestId, url);
    const kind = listedKind(p.type, p.response.mimeType, !!worker);
    if (!kind || UNLISTED_URL.test(url)) return;
    // While a navigation is pending, only its own document counts; it's listed when it commits.
    const heldForCommit = navigation.owns(p.loaderId);
    if (navigation.active && !heldForCommit) return;
    // A service worker's answer was served (or not) on its own session, under another request id.
    if (!overrideId && !p.response.fromServiceWorker) this.missed.report(url, kind, worker?.missedReason(url, isMainScript));
    // A worker session knows no frames; its entries are labelled with the worker.
    const frame = worker ? undefined : frames.frameOf(p.frameId, kind === DOCUMENT_KIND ? url : undefined);
    const existing = this.resources.get(url);
    // The same file loaded by the top frame and by an iframe is listed as the top frame's.
    if (existing && !existing.entry.frame && frame && existing.entry.overrideId === overrideId) return;
    const iframeId = opts.iframe?.id;
    const entry: ResourceEntry = {
      url,
      kind,
      mimeType: p.response.mimeType,
      status: p.response.status,
      ...(overrideId ? { overrideId } : {}),
      ...(frame ? { frame } : {}),
      ...(iframeId ? { iframeId } : {}),
      ...worker?.label(),
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
      navigation.hold(tracked);
      return;
    }
    this.add(tracked);
  }
}
