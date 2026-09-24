import type { ResourceContent, ResourceEntry } from '../../shared/types';
import { sessionTransport, type CdpTransport } from './cdp';
import { InterceptionEngine, type EngineOptions } from './InterceptionEngine';

/**
 * Cross-site iframes run in their own renderer process (site isolation) and are
 * separate CDP targets. Auto-attach pauses each one before it loads anything,
 * so an engine can be set up on it first. Workers are deliberately excluded.
 */
export const IFRAME_AUTO_ATTACH = {
  autoAttach: true,
  waitForDebuggerOnStart: true,
  flatten: true,
  filter: [{ type: 'iframe' }, { exclude: true }],
} as const;

/**
 * Upper bound for setting up an iframe (and for one fan-out step on it). A
 * paused iframe blocks its page, so after this we resume it regardless and
 * report that its first loads may bypass overrides.
 */
export const IFRAME_SETUP_TIMEOUT_MS = 5000;

interface AttachedToTarget {
  sessionId: string;
  targetInfo: { targetId: string; type: string; url: string };
  waitingForDebugger: boolean;
}

interface ChildTarget {
  sessionId: string;
  /** Equal to the iframe's frame id. Chromium may reuse it for a later session of the same frame. */
  targetId: string;
  /** Session that attached it: undefined for the page, else a parent iframe. */
  parentSessionId?: string;
  depth: number;
  engine: InterceptionEngine;
  /** Settles every in-flight command once the session is gone (Chromium never answers them). */
  gone(reason: Error): void;
}

class SessionGoneError extends Error {
  constructor(sessionId: string) {
    super(`iframe session ${sessionId} is gone`);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Interception for one page and all of its cross-site iframes: one
 * {@link InterceptionEngine} per CDP session (the page's own, plus one per
 * iframe session, recursively), each bound to its session, so a request paused
 * on one session is always answered on that same session. Presents the same
 * surface as a single engine.
 */
export class PageInterception {
  private readonly root: InterceptionEngine;
  /** Live iframe sessions by session id, in attach order. */
  private readonly children = new Map<string, ChildTarget>();
  private readonly disposers: Array<() => void> = [];
  private detached = false;

  constructor(private readonly opts: Omit<EngineOptions, 'iframe'>) {
    this.root = new InterceptionEngine({ ...opts, transport: sessionTransport(opts.transport) });
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on('Target.attachedToTarget', (p: AttachedToTarget, parentSessionId) => void this.onAttached(p, parentSessionId)),
      this.cdp.on('Target.detachedFromTarget', (p: { sessionId: string }) => this.removeTarget(p.sessionId)),
    );
    await this.root.attach();
    await this.cdp.send('Target.setAutoAttach', { ...IFRAME_AUTO_ATTACH });
  }

  /**
   * Stops intercepting. Iframe sessions get `Fetch.disable` first: it is the
   * only thing that releases a paused iframe navigation.
   */
  detach(): void {
    this.detached = true;
    for (const dispose of this.disposers.splice(0)) dispose();
    for (const sessionId of [...this.children.keys()]) this.removeTarget(sessionId, false);
    this.root.detach();
    this.cdp.send('Target.setAutoAttach', { autoAttach: false, waitForDebuggerOnStart: false, flatten: true }).catch(() => undefined);
  }

  /** Applies settings on the page and every live iframe session. */
  async applySettings(): Promise<void> {
    await this.fanOut((engine) => engine.applySettings());
  }

  /** Recomputes interception patterns on the page and every live iframe session. */
  async refreshInterception(): Promise<void> {
    await this.fanOut((engine) => engine.refreshInterception());
  }

  /** Resources of the page and its iframes (entries from cross-site iframes carry `iframeId`). */
  listResources(): ResourceEntry[] {
    return this.engines().flatMap((e) => e.listResources());
  }

  /**
   * Reads a resource through the session that loaded it (the page's first). A
   * cross-site iframe's own document is reported by its parent, but only the
   * iframe's session can return its body.
   */
  async getResourceContent(url: string): Promise<ResourceContent> {
    const owner = this.engines().find((e) => e.hasResource(url)) ?? this.root;
    const tracked = owner.trackedResource(url);
    const frameSession = tracked?.frameId && [...this.children.values()].find((c) => c.targetId === tracked.frameId && c.engine !== owner);
    if (tracked && frameSession) {
      try {
        const content = await withTimeout(frameSession.engine.readNetworkBody(url, tracked.requestId, tracked.mimeType), IFRAME_SETUP_TIMEOUT_MS, 'Reading the iframe document');
        // The parent served (and may have rewritten) this document; it knows the raw upstream hash.
        return { ...content, hash: owner.upstreamHashOf(url) ?? content.hash };
      } catch {
        // Fall through to the owner (and its out-of-page fetch).
      }
    }
    return owner.getResourceContent(url);
  }

  /** Live iframe sessions (for diagnostics and tests). */
  targets(): Array<{ targetId: string; sessionId: string; parentTargetId?: string; depth: number }> {
    return [...this.children.values()].map((c) => ({
      targetId: c.targetId,
      sessionId: c.sessionId,
      depth: c.depth,
      ...(c.parentSessionId ? { parentTargetId: this.children.get(c.parentSessionId)?.targetId } : {}),
    }));
  }

  private engines(): InterceptionEngine[] {
    return [this.root, ...[...this.children.values()].map((c) => c.engine)];
  }

  /** The page's errors propagate; an iframe's are ignored (its session can vanish or stall mid-call). */
  private async fanOut(task: (engine: InterceptionEngine) => Promise<void>): Promise<void> {
    const page = task(this.root);
    const children = [...this.children.values()].map((c) =>
      withTimeout(task(c.engine), IFRAME_SETUP_TIMEOUT_MS, 'Updating an iframe').catch(() => undefined),
    );
    await Promise.all([page, ...children]);
  }

  private async onAttached(p: AttachedToTarget, parentSessionId: string | undefined): Promise<void> {
    const { sessionId, targetInfo } = p;
    if (this.children.has(sessionId)) return;
    const parent = parentSessionId === undefined ? undefined : this.children.get(parentSessionId);
    const parentKnown = parentSessionId === undefined || !!parent;
    if (this.detached || targetInfo.type !== 'iframe' || !parentKnown) {
      await this.resume(sessionId);
      return;
    }

    // Registered synchronously, so a detach or fan-out racing the setup finds it.
    // In-flight commands are tracked individually (not raced against one long-lived
    // promise, which would pile up a reaction per command for the session's life).
    const base = sessionTransport(this.cdp, sessionId);
    const inFlight = new Set<(reason: Error) => void>();
    let goneReason: Error | undefined;
    const gone = (reason: Error) => {
      goneReason = reason;
      for (const reject of inFlight) reject(reason);
      inFlight.clear();
    };
    const transport: CdpTransport = {
      send: (method, params) =>
        goneReason
          ? Promise.reject(goneReason)
          : new Promise((resolve, reject) => {
              inFlight.add(reject);
              base.send(method, params).then(resolve, reject).finally(() => inFlight.delete(reject));
            }),
      on: base.on,
    };
    const depth = (parent?.depth ?? 0) + 1;
    const engine = new InterceptionEngine({ ...this.opts, transport, iframe: { id: sessionId, depth } });
    const child: ChildTarget = { sessionId, targetId: targetInfo.targetId, parentSessionId, depth, engine, gone };
    this.children.set(sessionId, child);

    try {
      await withTimeout(
        (async () => {
          await engine.attach();
          // Depth counts frames, not sessions: this iframe may sit inside a same-site iframe of its parent.
          const parentEngine = parent?.engine ?? this.root;
          if (engine.parentFrameId) engine.setBaseDepth(parentEngine.frameDepth(engine.parentFrameId) + 1);
          // Nested cross-site iframes attach through this session.
          if (this.children.get(sessionId) === child) await transport.send('Target.setAutoAttach', { ...IFRAME_AUTO_ATTACH });
        })(),
        IFRAME_SETUP_TIMEOUT_MS,
        'Setting up the iframe',
      );
    } catch (err) {
      if (this.children.get(sessionId) === child && !(err instanceof SessionGoneError)) {
        this.opts.emit({
          type: 'error',
          message: `Overrides may not apply inside iframe ${targetInfo.url || targetInfo.targetId}: ${(err as Error).message}`,
        });
      }
    } finally {
      // Always let the iframe run: a frame left paused would hang the page.
      // (A session that is already gone just answers with an error.)
      await this.resume(sessionId);
    }
  }

  /** Drops a session and, recursively, every iframe session nested in it (Chromium doesn't report those). */
  private removeTarget(sessionId: string, notify = true): void {
    const child = this.children.get(sessionId);
    if (!child) return;
    for (const nested of [...this.children.values()]) {
      if (nested.parentSessionId === sessionId) this.removeTarget(nested.sessionId, notify);
    }
    this.children.delete(sessionId);
    child.engine.detach();
    child.gone(new SessionGoneError(sessionId));
    if (notify) this.opts.emit({ type: 'iframe-detached', iframeId: sessionId });
  }

  private async resume(sessionId: string): Promise<void> {
    await this.cdp.send('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => undefined);
  }
}
