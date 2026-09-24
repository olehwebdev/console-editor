import type { ResourceContent, ResourceEntry } from '../../../shared/types';
import { sessionTransport, type CdpTransport } from '../cdp';
import { CDP, TARGET_TYPE } from '../constants';
import { InterceptionEngine } from '../InterceptionEngine';
import { attachTarget } from './attachTarget';
import { ChildSessions } from './ChildSessions';
import { AUTO_ATTACH, SETUP_TIMEOUT_MS } from './constants';
import { fanOut } from './fanOut';
import { observeSession } from './observeSession';
import { prepareReload } from './prepareReload';
import { readPageResource } from './readPageResource';
import { ServiceWorkerRegistry } from './ServiceWorkerRegistry';
import { SharedWorkers } from './SharedWorkers';
import type { AttachedToTarget, ChildContext, PageInterceptionOptions, TargetSummary } from './types';
import { withTimeout } from './withTimeout';

/**
 * Interception for one page, its cross-site iframes and its workers: one
 * {@link InterceptionEngine} per CDP session (the page's own, plus one per
 * iframe or worker session, recursively), each bound to its session, so a
 * request paused on one session is always answered on that same session.
 * Presents the same surface as a single engine.
 */
export class PageInterception {
  private readonly root: InterceptionEngine;
  /** Live child sessions by session id, in attach order. */
  private readonly children: ChildSessions;
  private readonly serviceWorkers = new ServiceWorkerRegistry();
  private readonly sharedWorkers: SharedWorkers;
  private readonly ctx: ChildContext;
  private readonly disposers: Array<() => void> = [];
  private detached = false;

  constructor(private readonly opts: PageInterceptionOptions) {
    this.sharedWorkers = new SharedWorkers(opts.transport, () => this.detached, (targetId) => this.children.hasTarget(targetId));
    this.children = new ChildSessions(opts, this.serviceWorkers, this.sharedWorkers);
    // Shared by every engine: a dedicated worker's requests are served on one session and reported on another.
    const engineOptions = { ...opts, servedBy: new Map<string, string>(), workerSetups: () => this.sharedWorkers.setups() };
    this.root = new InterceptionEngine({ ...engineOptions, transport: sessionTransport(opts.transport) });
    const { children, serviceWorkers, sharedWorkers } = this;
    this.ctx = { cdp: opts.transport, opts, engineOptions, root: this.root, children, serviceWorkers, sharedWorkers, stopped: () => this.detached };
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on(CDP.Target.attachedToTarget, (p: AttachedToTarget, parentSessionId) => void attachTarget(this.ctx, p, parentSessionId)),
      this.cdp.on(CDP.Target.detachedFromTarget, (p: { sessionId: string }) => this.children.remove(p.sessionId)),
      ...this.sharedWorkers.listen(),
      ...this.serviceWorkers.listen(this.cdp),
    );
    await this.root.attach();
    if (this.detached) return;
    // Bounded like an iframe's setup: the page loads nothing until this returns.
    await withTimeout(observeSession(this.opts.sessions, undefined, sessionTransport(this.cdp)), SETUP_TIMEOUT_MS, 'Setting up the page').catch(() => undefined);
    await this.cdp.send(CDP.Target.setAutoAttach, { ...AUTO_ATTACH });
    await this.sharedWorkers.discover();
    // Registration scopes, to unregister an outdated service worker even while it's stopped. Not awaited: it
    // reads every stored registration, and the page needn't wait for that.
    this.cdp.send(CDP.ServiceWorker.enable).catch(() => undefined);
  }

  /**
   * Stops intercepting. Iframe sessions get `Fetch.disable` first: it is the
   * only thing that releases a paused iframe navigation.
   */
  detach(): void {
    this.detached = true;
    for (const dispose of this.disposers.splice(0)) dispose();
    // Attached through discovery, not auto-attach: let go of them explicitly.
    for (const child of this.children.list().filter((c) => c.type === TARGET_TYPE.sharedWorker)) {
      this.cdp.send(CDP.Target.detachFromTarget, { sessionId: child.sessionId }).catch(() => undefined);
    }
    this.children.removeAll();
    this.root.detach();
    this.sharedWorkers.stop();
    this.serviceWorkers.clear();
    this.opts.sessions?.detached(undefined);
    this.cdp.send(CDP.ServiceWorker.disable).catch(() => undefined);
    this.cdp.send(CDP.Target.setAutoAttach, { autoAttach: false, waitForDebuggerOnStart: false, flatten: true }).catch(() => undefined);
  }

  /** Applies settings on the page and every live child session. */
  async applySettings(): Promise<void> {
    await fanOut(this.root, this.children, (engine) => engine.applySettings());
  }

  /** Recomputes interception patterns on the page and every live child session. */
  async refreshInterception(): Promise<void> {
    await fanOut(this.root, this.children, (engine) => engine.refreshInterception());
  }

  /** Before loading `url` after overrides changed: reinstalls service workers running outdated code (see {@link prepareReload}). */
  prepareReload(url?: string): Promise<void> {
    return prepareReload(this.ctx, url);
  }

  /** Resources of the page, its iframes and its workers (entries from child sessions carry their id). */
  listResources(): ResourceEntry[] {
    return [this.root, ...this.children.engines()].flatMap((e) => e.listResources());
  }

  /** Reads a resource through the session that loaded it (see {@link readPageResource}). */
  getResourceContent(url: string): Promise<ResourceContent> {
    return readPageResource(this.root, this.children, url);
  }

  /** Live child sessions (for diagnostics and tests). */
  targets(): TargetSummary[] {
    return this.children.targets();
  }
}
