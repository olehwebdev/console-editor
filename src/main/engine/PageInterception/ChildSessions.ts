import { TARGET_TYPE } from '../constants';
import type { InterceptionEngine } from '../InterceptionEngine';
import type { ServiceWorkerRegistry } from './ServiceWorkerRegistry';
import { SessionGoneError } from './SessionGoneError';
import type { SharedWorkers } from './SharedWorkers';
import type { ChildTarget, PageInterceptionOptions, TargetSummary } from './types';

/** The live child sessions of a page (its cross-site iframes' and its workers') by session id, in attach order. */
export class ChildSessions {
  private readonly children = new Map<string, ChildTarget>();

  constructor(
    private readonly opts: Pick<PageInterceptionOptions, 'emit' | 'sessions'>,
    private readonly serviceWorkers: ServiceWorkerRegistry,
    private readonly sharedWorkers: SharedWorkers,
  ) {}

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

  /** Whether a target has a live session. */
  hasTarget(targetId: string): boolean {
    return this.list().some((c) => c.targetId === targetId);
  }

  /** Live child sessions (for diagnostics and tests). */
  targets(): TargetSummary[] {
    return this.list().map((c) => ({
      targetId: c.targetId,
      sessionId: c.sessionId,
      type: c.type,
      depth: c.depth,
      ...(c.parentSessionId ? { parentTargetId: this.children.get(c.parentSessionId)?.targetId } : {}),
    }));
  }

  /** Drops a session and, recursively, every session nested in it (Chromium doesn't always report those). */
  remove(sessionId: string, notify = true): void {
    const child = this.children.get(sessionId);
    if (!child) return;
    for (const nested of [...this.children.values()]) {
      if (nested.parentSessionId === sessionId) this.remove(nested.sessionId, notify);
    }
    this.children.delete(sessionId);
    for (const dispose of child.dispose.splice(0)) dispose();
    if (child.type === TARGET_TYPE.serviceWorker) this.serviceWorkers.keep(child);
    child.engine.detach();
    child.gone(new SessionGoneError(sessionId));
    if (child.type === TARGET_TYPE.sharedWorker) this.sharedWorkers.settle(child.targetId);
    const iframe = child.type === TARGET_TYPE.iframe;
    // The observer is only given iframe sessions (see `attachIframe`).
    if (iframe) this.opts.sessions?.detached(sessionId);
    if (notify) this.opts.emit(iframe ? { type: 'iframe-detached', iframeId: sessionId } : { type: 'worker-detached', workerId: sessionId });
  }

  /** Drops every session without reporting it (interception is stopping). */
  removeAll(): void {
    for (const sessionId of [...this.children.keys()]) this.remove(sessionId, false);
  }
}
