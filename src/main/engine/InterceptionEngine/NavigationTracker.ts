import { DOCUMENT_KIND } from './constants';
import type { FrameTracker } from './FrameTracker';
import type { RequestWillBeSentParams, TrackedResource } from './types';

/**
 * A navigation of this session's root frame that has started but not
 * committed. Until it commits, the old document keeps loading things (they
 * must not be listed as the new page's), and it may never commit at all
 * (a download, a 204), in which case the list must stay as it is.
 */
export class NavigationTracker {
  private pending: { loaderId: string; held: TrackedResource[] } | undefined;

  constructor(private readonly frames: FrameTracker) {}

  /** Whether a navigation has started and not committed or stopped. */
  get active(): boolean {
    return !!this.pending;
  }

  /** A request was sent: a document request of the root frame starts a navigation. */
  requested(p: RequestWillBeSentParams): void {
    const mainFrameId = this.frames.rootId;
    const isMainFrameNavigation = p.type === DOCUMENT_KIND && p.requestId === p.loaderId && (!mainFrameId || p.frameId === mainFrameId);
    if (!isMainFrameNavigation) return;
    // Redirects re-send the same request; keep what was already held.
    if (this.pending?.loaderId !== p.loaderId) this.pending = { loaderId: p.loaderId, held: [] };
  }

  /** A frame stopped loading. */
  stopped(frameId: string): void {
    // Stopped without committing (download, 204, cancelled): the old page stays, and so does its list.
    if (frameId === this.frames.rootId && this.pending) this.pending = undefined;
  }

  /** Whether a response belongs to the pending navigation (it's listed when the navigation commits). */
  owns(loaderId: string | undefined): boolean {
    return !!this.pending && loaderId === this.pending.loaderId;
  }

  /** Keeps a resource of the pending navigation until it commits. */
  hold(tracked: TrackedResource): void {
    this.pending?.held.push(tracked);
  }

  /**
   * The root frame committed the document of `loaderId`: returns what its
   * navigation held. A document committed without a request of its own (no
   * `loaderId`) takes what is pending.
   */
  commit(loaderId: string | undefined): TrackedResource[] {
    const held = !loaderId || this.pending?.loaderId === loaderId ? (this.pending?.held ?? []) : [];
    this.pending = undefined;
    return held;
  }
}
