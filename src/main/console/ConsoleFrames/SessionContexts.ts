import type { SessionKey } from './types';

/** Per session: the frame each JavaScript context belongs to, and the frame the session was made for. */
export class SessionContexts {
  /** Per session: execution context id -> its frame, in any world (logs name the context they came from). */
  private readonly contexts = new Map<SessionKey, Map<number, string>>();
  /** Per session: the frame it was made for (the top page, or an iframe). */
  private readonly roots = new Map<SessionKey, string>();

  setRoot(sessionId: SessionKey, frameId: string): void {
    this.roots.set(sessionId, frameId);
  }

  add(sessionId: SessionKey, contextId: number, frameId: string): void {
    let contexts = this.contexts.get(sessionId);
    if (!contexts) this.contexts.set(sessionId, (contexts = new Map()));
    contexts.set(contextId, frameId);
  }

  /** Forgets a context; returns the frame it belonged to. */
  remove(sessionId: SessionKey, contextId: number): string | undefined {
    const contexts = this.contexts.get(sessionId);
    const frameId = contexts?.get(contextId);
    contexts?.delete(contextId);
    return frameId;
  }

  /** Every context of a session went away (its page navigated). */
  sessionCleared(sessionId: SessionKey): void {
    this.contexts.get(sessionId)?.clear();
  }

  sessionGone(sessionId: SessionKey): void {
    this.contexts.delete(sessionId);
    this.roots.delete(sessionId);
  }

  clear(): void {
    this.contexts.clear();
    this.roots.clear();
  }

  /** The frame a context belongs to; a context the console doesn't know counts as the session's root frame. */
  frameOf(sessionId: SessionKey, contextId?: number): string | null {
    const known = contextId === undefined ? undefined : this.contexts.get(sessionId)?.get(contextId);
    return known ?? this.roots.get(sessionId) ?? null;
  }
}
