import type { ConsoleFrame } from '../../shared/types';
import { FRAME_SWAP_REASON } from '../engine/constants';
import type { ExecutionContext, FrameRecord, PageFrame, PageFrameTree } from './types';

/** A CDP session: undefined for the page's own. */
type SessionKey = string | undefined;

/**
 * The page's frames across its CDP sessions, and the JavaScript contexts they run in.
 *
 * A frame is keyed by its id, which survives a move to another process (a new
 * session), so a frame keeps its rows and name when that happens; the session
 * is only where its code runs. Same-site iframes share their parent's session,
 * so one session can host several frames.
 */
export class ConsoleFrames {
  private readonly records = new Map<string, FrameRecord>();
  /** Per session: execution context id -> its frame, in any world (logs name the context they came from). */
  private readonly contexts = new Map<SessionKey, Map<number, string>>();
  /** Per session: the frame it was made for (the top page, or an iframe). */
  private readonly roots = new Map<SessionKey, string>();

  /** `changed` runs after every change to what `list` returns. */
  constructor(private readonly changed: () => void) {}

  /** A session's frames, from `Page.getFrameTree`. Its root frame is hosted there from now on. */
  seed(sessionId: SessionKey, tree: PageFrameTree): void {
    this.roots.set(sessionId, tree.frame.id);
    this.put(sessionId, tree.frame, true);
    this.seedChildren(sessionId, tree);
    this.changed();
  }

  /** A frame committed a new document in this session, which therefore hosts it. */
  navigated(sessionId: SessionKey, frame: PageFrame): void {
    this.put(sessionId, frame, true);
    this.changed();
  }

  /** A frame was added (it has no document yet). */
  attached(sessionId: SessionKey, frameId: string, parentId: string | undefined): void {
    if (this.records.has(frameId)) return;
    this.put(sessionId, { id: frameId, parentId, url: '' }, true);
    this.changed();
  }

  /** A frame was removed, with every frame in it. One that moved to another process is still there. */
  detached(frameId: string, reason: string | undefined): void {
    if (reason === FRAME_SWAP_REASON || !this.records.has(frameId)) return;
    this.remove(frameId);
    this.changed();
  }

  contextCreated(sessionId: SessionKey, context: ExecutionContext): void {
    const frameId = context.auxData?.frameId;
    if (!frameId) return;
    this.contextsOf(sessionId).set(context.id, frameId);
    // Other worlds (extensions, injected scripts) are only for telling where logs came from.
    if (!context.auxData?.isDefault) return;
    const record = this.records.get(frameId) ?? this.create(sessionId, frameId);
    record.sessionId = sessionId;
    record.context = { sessionId, id: context.id, uniqueId: context.uniqueId };
    this.changed();
  }

  contextDestroyed(sessionId: SessionKey, contextId: number): void {
    const contexts = this.contexts.get(sessionId);
    const frameId = contexts?.get(contextId);
    contexts?.delete(contextId);
    const record = frameId === undefined ? undefined : this.records.get(frameId);
    if (!record?.context || record.context.sessionId !== sessionId || record.context.id !== contextId) return;
    record.context = undefined;
    this.changed();
  }

  /** Every context of a session went away (its page navigated). */
  contextsCleared(sessionId: SessionKey): void {
    this.contexts.get(sessionId)?.clear();
    for (const record of this.records.values()) {
      if (record.context?.sessionId === sessionId) record.context = undefined;
    }
    this.changed();
  }

  /** A session went away with the frames it hosted (nested sessions report their own). */
  sessionGone(sessionId: SessionKey): void {
    this.contexts.delete(sessionId);
    this.roots.delete(sessionId);
    for (const record of [...this.records.values()]) {
      if (record.sessionId === sessionId) this.records.delete(record.id);
    }
    this.changed();
  }

  clear(): void {
    this.records.clear();
    this.contexts.clear();
    this.roots.clear();
    this.changed();
  }

  /** The frame a context belongs to; a context the console doesn't know counts as the session's root frame. */
  frameOf(sessionId: SessionKey, contextId?: number): string | null {
    const known = contextId === undefined ? undefined : this.contexts.get(sessionId)?.get(contextId);
    return known ?? this.roots.get(sessionId) ?? null;
  }

  /** Where code for a frame runs: its session and main-world context, while it has one. */
  target(frameId: string): FrameRecord['context'] {
    return this.records.get(frameId)?.context;
  }

  list(): ConsoleFrame[] {
    return [...this.records.values()].map((r) => ({
      id: r.id,
      ...(r.parentId ? { parentId: r.parentId } : {}),
      url: r.url,
      name: r.name,
      canRun: !!r.context,
    }));
  }

  /**
   * Records what a session says of a frame; `hosts`: the frame runs in that
   * session. A parent's view of a frame another process hosts can be stale, so
   * it only fills in a frame not yet known.
   */
  private put(sessionId: SessionKey, frame: PageFrame, hosts: boolean): void {
    const existing = this.records.get(frame.id);
    if (existing && !hosts) return;
    const record = existing ?? this.create(sessionId, frame.id);
    record.url = frame.url;
    if (frame.name !== undefined) record.name = frame.name;
    if (frame.parentId) record.parentId = frame.parentId;
    record.sessionId = sessionId;
  }

  private seedChildren(sessionId: SessionKey, tree: PageFrameTree): void {
    for (const child of tree.childFrames ?? []) {
      this.put(sessionId, child.frame, false);
      this.seedChildren(sessionId, child);
    }
  }

  private create(sessionId: SessionKey, frameId: string): FrameRecord {
    const record: FrameRecord = { id: frameId, url: '', name: '', sessionId };
    this.records.set(frameId, record);
    return record;
  }

  private contextsOf(sessionId: SessionKey): Map<number, string> {
    let contexts = this.contexts.get(sessionId);
    if (!contexts) this.contexts.set(sessionId, (contexts = new Map()));
    return contexts;
  }

  /** Drops a frame and every frame nested in it. */
  private remove(frameId: string): void {
    this.records.delete(frameId);
    for (const record of [...this.records.values()]) {
      if (record.parentId === frameId) this.remove(record.id);
    }
  }
}
