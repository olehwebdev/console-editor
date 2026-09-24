import type { InterceptionEngine } from '../InterceptionEngine';
import { SessionGoneError } from './SessionGoneError';
import type { ChildTarget, PageInterceptionOptions, TargetSummary } from './types';

/** The live iframe sessions of a page by session id, in attach order. */
export class ChildSessions {
  private readonly children = new Map<string, ChildTarget>();

  constructor(private readonly opts: Pick<PageInterceptionOptions, 'emit' | 'sessions'>) {}

  has(sessionId: string): boolean {
    return this.children.has(sessionId);
  }

  get(sessionId: string): ChildTarget | undefined {
    return this.children.get(sessionId);
  }

  /** Registers a session that is being set up. */
  add(child: ChildTarget): void {
    this.children.set(child.sessionId, child);
  }

  /** Whether `child` is still registered (not removed, nor replaced by a later session). */
  isLive(child: ChildTarget): boolean {
    return this.children.get(child.sessionId) === child;
  }

  list(): ChildTarget[] {
    return [...this.children.values()];
  }

  engines(): InterceptionEngine[] {
    return this.list().map((c) => c.engine);
  }

  /** Live iframe sessions (for diagnostics and tests). */
  targets(): TargetSummary[] {
    return this.list().map((c) => ({
      targetId: c.targetId,
      sessionId: c.sessionId,
      depth: c.depth,
      ...(c.parentSessionId ? { parentTargetId: this.children.get(c.parentSessionId)?.targetId } : {}),
    }));
  }

  /** Drops a session and, recursively, every iframe session nested in it (Chromium doesn't report those). */
  remove(sessionId: string, notify = true): void {
    const child = this.children.get(sessionId);
    if (!child) return;
    for (const nested of [...this.children.values()]) {
      if (nested.parentSessionId === sessionId) this.remove(nested.sessionId, notify);
    }
    this.children.delete(sessionId);
    child.engine.detach();
    child.gone(new SessionGoneError(sessionId));
    this.opts.sessions?.detached(sessionId);
    if (notify) this.opts.emit({ type: 'iframe-detached', iframeId: sessionId });
  }

  /** Drops every session without reporting it (interception is stopping). */
  removeAll(): void {
    for (const sessionId of [...this.children.keys()]) this.remove(sessionId, false);
  }
}
