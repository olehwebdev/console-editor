import { FRAME_SWAP_REASON } from '../constants';
import type { FrameAttachedParams, FrameDetachedParams, FrameTree, NavigatedFrame } from './types';

/** Bounds the walk up `parents`, which a stale entry could turn into a loop. */
const MAX_FRAME_DEPTH = 32;

/**
 * The frames of one CDP session: its root frame, and every frame's document URL
 * and parent, to tell which iframe (and how deep) a resource was loaded in.
 */
export class FrameTracker {
  /** Frame id -> document URL for every frame this session knows about. */
  private readonly urls = new Map<string, string>();
  /** Frame id -> parent frame id, to compute iframe depth. */
  private readonly parents = new Map<string, string>();
  private mainFrameId: string | undefined;
  /** Parent frame of an iframe session's root frame (it lives in the parent's session). */
  private rootParentFrameId: string | undefined;

  /**
   * @param baseDepth Nesting depth of this session's root frame (0 for the page's own session).
   * @param iframe Whether this is an iframe session, whose root frame has a (cross-process) parent.
   */
  constructor(
    private baseDepth: number,
    private readonly iframe: boolean,
  ) {}

  /** The session's root frame: the page's main frame, or the iframe the session was made for. */
  get rootId(): string | undefined {
    return this.mainFrameId;
  }

  /** For an iframe session: the frame (in the parent's session) that contains its root frame. */
  get parentFrameId(): string | undefined {
    return this.iframe ? this.rootParentFrameId : undefined;
  }

  /** The document URL of a frame of this session (the root frame when none is given), if known. */
  urlOf(frameId: string | undefined): string | undefined {
    const id = frameId ?? this.mainFrameId;
    return id === undefined ? undefined : this.urls.get(id);
  }

  /** The session's frames, from `Page.getFrameTree`. */
  seed(tree: FrameTree): void {
    this.mainFrameId = tree.frame.id;
    this.rootParentFrameId = tree.frame.parentId;
    this.remember(tree);
  }

  /** A frame committed a new document. Returns whether it is the session's root frame. */
  navigated(frame: NavigatedFrame): boolean {
    this.urls.set(frame.id, frame.url);
    // An iframe session's root frame has a (cross-process) parentId; it stays the root.
    if (frame.parentId && frame.id !== this.mainFrameId) this.parents.set(frame.id, frame.parentId);
    if (!frame.parentId && !this.iframe) this.mainFrameId = frame.id;
    return frame.id === this.mainFrameId;
  }

  attached(p: FrameAttachedParams): void {
    if (p.parentFrameId) this.parents.set(p.frameId, p.parentFrameId);
  }

  detached(p: FrameDetachedParams): void {
    this.urls.delete(p.frameId);
    // A frame that moved to another process still has its documents reported here.
    if (p.reason !== FRAME_SWAP_REASON) this.parents.delete(p.frameId);
  }

  /** The root frame committed a new document: the old document's subframes are gone. */
  forgetSubframes(): void {
    for (const id of [...this.urls.keys()]) if (id !== this.mainFrameId) this.urls.delete(id);
    this.parents.clear();
  }

  /** Nesting depth of a frame of this session (0 = the top-level page). */
  depth(frameId: string | undefined): number {
    return this.baseDepth + this.localDepth(frameId);
  }

  /** Corrects this iframe session's depth once its position in the parent is known. */
  setBaseDepth(depth: number): void {
    this.baseDepth = depth;
  }

  /**
   * The iframe a resource was loaded in, or undefined for the top-level page.
   * `documentUrl` covers an iframe's own document, which is requested (and
   * reported) by its parent before this session knows the new frame.
   */
  frameOf(frameId: string | undefined, documentUrl?: string): { url: string; depth: number } | undefined {
    const depth = this.depth(frameId);
    if (depth === 0) return undefined;
    // A frame's new document arrives before the frame's cached URL is updated: use the document's own.
    return { url: documentUrl || (frameId && this.urls.get(frameId)) || '', depth };
  }

  private remember(node: FrameTree): void {
    if (node.frame.url) this.urls.set(node.frame.id, node.frame.url);
    if (node.frame.parentId && node.frame.id !== this.mainFrameId) this.parents.set(node.frame.id, node.frame.parentId);
    for (const child of node.childFrames ?? []) this.remember(child);
  }

  /** Nesting of a frame below this session's root frame (0 = the root frame itself). */
  private localDepth(frameId: string | undefined): number {
    let depth = 0;
    for (let id = frameId; id && id !== this.mainFrameId && depth < MAX_FRAME_DEPTH; id = this.parents.get(id)) depth++;
    return depth;
  }
}
