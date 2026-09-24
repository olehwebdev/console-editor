import type { ResourceContent, ResourceEntry, WorkerType } from '../../../shared/types';
import { sessionTransport, type CdpTransport } from '../cdp';
import { CDP, TARGET_TYPE } from '../constants';
import { InterceptionEngine, isServiceWorkerOutdated, originOf, type EngineOptions, type ServiceWorkerState } from '../InterceptionEngine';
import { AUTO_ATTACH, SETUP_TIMEOUT_MS, SHARED_WORKER_HOLD_MS, UNREGISTER_TIMEOUT_MS } from './constants';
import { SessionGoneError } from './SessionGoneError';
import type { AttachedToTarget, ChildTarget, ChildType, PendingSharedWorker, TargetInfo, WorkerSetup } from './types';
import { withTimeout } from './withTimeout';

/** Service workers whose state is kept after their session went away (the page may come back to them). */
const KEPT_SERVICE_WORKERS = 50;

/** Reports the shared workers of every browser context as they are created (shared workers aren't auto-attached). */
const DISCOVER_SHARED_WORKERS = { discover: true, filter: [{ type: TARGET_TYPE.sharedWorker }, { exclude: true }] };

/** Run in a service worker: asks it to unregister (when its registration's scope isn't known). */
const UNREGISTER_EXPRESSION = 'self.registration.unregister()';

/** How each kind of worker's session is set up: a new kind fails typecheck until it's here. */
const WORKER_SETUP: Record<WorkerType, WorkerSetup> = {
  worker: { name: 'worker', startsWorkers: true, inspector: false },
  shared_worker: { name: 'shared worker', startsWorkers: false, inspector: true },
  service_worker: { name: 'service worker', startsWorkers: false, inspector: true },
  worklet: { name: 'worklet', startsWorkers: false, inspector: false },
};

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
  private readonly children = new Map<string, ChildTarget>();
  private readonly disposers: Array<() => void> = [];
  /** Shared by every engine: a dedicated worker's requests are served on one session and reported on another. */
  private readonly servedBy = new Map<string, string>();
  /** Shared workers found but not yet intercepting, by target id. */
  private readonly pendingShared = new Map<string, PendingSharedWorker>();
  /** The site's browser context: discovery reports shared workers of every context. */
  private browserContextId: string | undefined;
  /**
   * What a service worker's last session knew, by target id: leaving its site
   * detaches it, and coming back attaches the same worker on a new session.
   */
  private readonly serviceWorkers = new Map<string, ServiceWorkerState>();
  /** Service worker target id -> registration id, and registration id -> scope (ServiceWorker domain). */
  private readonly registrationOf = new Map<string, string>();
  private readonly scopeOf = new Map<string, string>();
  /** Registrations reported deleted (unregistered): a worker of one is on its way out. */
  private readonly deletedRegistrations = new Set<string>();
  /**
   * Service workers the app unregistered. Chromium keeps such a version running
   * while it's attached and attaches it again after a detach; it's left alone
   * then (unregistering from it would hit the registration now at its scope).
   */
  private readonly retiredTargets = new Set<string>();
  private detached = false;

  constructor(private readonly opts: Omit<EngineOptions, 'iframe' | 'worker' | 'servedBy' | 'workerSetups'>) {
    this.root = new InterceptionEngine({ ...this.engineOptions(), transport: sessionTransport(opts.transport) });
  }

  private get cdp(): CdpTransport {
    return this.opts.transport;
  }

  private engineOptions(): Omit<EngineOptions, 'transport'> {
    return { ...this.opts, servedBy: this.servedBy, workerSetups: () => this.sharedWorkerSetups() };
  }

  async attach(): Promise<void> {
    this.disposers.push(
      this.cdp.on(CDP.Target.attachedToTarget, (p: AttachedToTarget, parentSessionId) => this.onAttached(p, parentSessionId)),
      this.cdp.on(CDP.Target.detachedFromTarget, (p: { sessionId: string }) => this.removeTarget(p.sessionId)),
      this.cdp.on(CDP.Target.targetCreated, (p: { targetInfo: TargetInfo }, sessionId) => {
        if (!sessionId) this.onTargetCreated(p.targetInfo);
      }),
      this.cdp.on(CDP.Target.targetDestroyed, (p: { targetId: string }, sessionId) => {
        if (!sessionId) this.pendingShared.get(p.targetId)?.settle();
      }),
      this.cdp.on(CDP.ServiceWorker.workerVersionUpdated, (p: { versions: Array<{ registrationId: string; targetId?: string }> }, sessionId) => {
        if (sessionId) return;
        for (const v of p.versions) if (v.targetId) this.registrationOf.set(v.targetId, v.registrationId);
      }),
      this.cdp.on(
        CDP.ServiceWorker.workerRegistrationUpdated,
        (p: { registrations: Array<{ registrationId: string; scopeURL: string; isDeleted: boolean }> }, sessionId) => {
          if (sessionId) return;
          for (const r of p.registrations) {
            if (r.isDeleted) {
              this.scopeOf.delete(r.registrationId);
              this.deletedRegistrations.add(r.registrationId);
            } else {
              this.scopeOf.set(r.registrationId, r.scopeURL);
            }
          }
        },
      ),
    );
    await this.root.attach();
    await this.cdp.send(CDP.Target.setAutoAttach, { ...AUTO_ATTACH });
    // Shared workers: found through discovery, attached before they start.
    try {
      const { targetInfo } = await this.cdp.send<{ targetInfo: TargetInfo }>(CDP.Target.getTargetInfo);
      this.browserContextId = targetInfo.browserContextId;
      await this.cdp.send(CDP.Target.setDiscoverTargets, DISCOVER_SHARED_WORKERS);
    } catch {
      // Without discovery, a shared worker's own loads just aren't intercepted.
    }
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
    for (const pending of this.pendingShared.values()) pending.settle();
    for (const child of [...this.children.values()]) {
      if (child.type === TARGET_TYPE.sharedWorker) this.cdp.send(CDP.Target.detachFromTarget, { sessionId: child.sessionId }).catch(() => undefined);
    }
    for (const sessionId of [...this.children.keys()]) this.removeTarget(sessionId, false);
    this.root.detach();
    this.serviceWorkers.clear();
    this.retiredTargets.clear();
    this.deletedRegistrations.clear();
    this.cdp.send(CDP.Target.setDiscoverTargets, { discover: false }).catch(() => undefined);
    this.cdp.send(CDP.ServiceWorker.disable).catch(() => undefined);
    this.cdp.send(CDP.Target.setAutoAttach, { autoAttach: false, waitForDebuggerOnStart: false, flatten: true }).catch(() => undefined);
  }

  /** Applies settings on the page and every live child session. */
  async applySettings(): Promise<void> {
    await this.fanOut((engine) => engine.applySettings());
  }

  /** Recomputes interception patterns on the page and every live child session. */
  async refreshInterception(): Promise<void> {
    await this.fanOut((engine) => engine.refreshInterception());
  }

  /**
   * Call before loading `url` (reloading, or navigating) after overrides
   * changed. Chromium keeps a service worker's installed scripts and doesn't
   * fetch them on reload, so a service worker running other code than would be
   * served now is asked to unregister: the page's `register()` then installs it
   * afresh, through interception. (With the page bypassing service workers, the
   * default, nothing else ever fetches them again, and nothing undoes the new
   * install.) That includes one of `url`'s site that went with the page it left
   * (switching workspaces leaves the page first, then changes the overrides).
   */
  async prepareReload(url?: string): Promise<void> {
    const outdated = [...this.children.values()].filter((c) => c.type === TARGET_TYPE.serviceWorker && !c.retired && c.engine.isOutdated());
    await Promise.all([...outdated.map((child) => this.unregisterAttached(child)), ...this.outdatedKept(url).map((targetId) => this.unregisterKept(targetId))]);
  }

  /** Service workers of `url`'s site whose session went away, running outdated code. */
  private outdatedKept(url: string | undefined): string[] {
    if (!url) return [];
    const origin = originOf(url);
    const attached = new Set([...this.children.values()].map((c) => c.targetId));
    const versionOf = (script: string, resourceType: string) => this.root.overrideVersion(script, resourceType);
    return [...this.serviceWorkers]
      .filter(([targetId, state]) => !attached.has(targetId) && originOf(state.url) === origin)
      .filter(([, state]) => isServiceWorkerOutdated(state, this.opts.getOverrides(), versionOf))
      .map(([targetId]) => targetId);
  }

  /**
   * Unregisters a service worker with no session, through the browser: only
   * possible while its scope is known. Forgotten once done (or once its
   * registration is gone); else kept, and handled when it attaches again.
   */
  private async unregisterKept(targetId: string): Promise<void> {
    const registration = this.registrationOf.get(targetId);
    if (registration && this.deletedRegistrations.has(registration)) {
      this.serviceWorkers.delete(targetId);
      return;
    }
    const scopeURL = registration && this.scopeOf.get(registration);
    if (!scopeURL) return;
    const unregister = this.cdp.send(CDP.ServiceWorker.unregister, { scopeURL }).then(() => true);
    if (!(await withTimeout(unregister, UNREGISTER_TIMEOUT_MS, 'Unregistering the service worker').catch(() => false))) return;
    this.serviceWorkers.delete(targetId);
    // Chromium may attach the unregistered version again: it's left alone then, as when a session is let go.
    this.retiredTargets.add(targetId);
  }

  /** Unregisters a service worker with a session: by scope through the browser, else from inside it. */
  private async unregisterAttached(child: ChildTarget): Promise<void> {
    // Through the browser when its scope is known (a stopped worker can't answer).
    const registration = this.registrationOf.get(child.targetId);
    const scopeURL = registration && this.scopeOf.get(registration);
    // Its registration is gone already: unregistering by scope would hit a newer one.
    if (registration && this.deletedRegistrations.has(registration)) return this.retire(child);
    const unregister = scopeURL
      ? this.cdp.send(CDP.ServiceWorker.unregister, { scopeURL }).then(() => true)
      : child.transport
          .send<{ result?: { value?: unknown }; exceptionDetails?: unknown }>(CDP.Runtime.evaluate, {
            expression: UNREGISTER_EXPRESSION,
            awaitPromise: true,
            returnByValue: true,
          })
          // A rejected unregister() still answers, with exceptionDetails.
          .then((r) => !r.exceptionDetails && r.result?.value === true);
    // Otherwise tried again on the next reload.
    if (await withTimeout(unregister, UNREGISTER_TIMEOUT_MS, 'Unregistering the service worker').catch(() => false)) this.retire(child);
  }

  /** Lets an unregistered service worker go, with its files; the reload installs it afresh. */
  private retire(child: ChildTarget): void {
    child.retired = true;
    this.retiredTargets.add(child.targetId);
    this.cdp.send(CDP.Target.detachFromTarget, { sessionId: child.sessionId }).catch(() => undefined);
  }

  /** Resources of the page, its iframes and its workers (entries from child sessions carry their id). */
  listResources(): ResourceEntry[] {
    return this.engines().flatMap((e) => e.listResources());
  }

  /**
   * Reads a resource through the session that loaded it (the page's first). A
   * cross-site iframe's own document is reported by its parent, but only the
   * iframe's session can return its body; a worker's files only its session.
   */
  async getResourceContent(url: string): Promise<ResourceContent> {
    const owner = this.engines().find((e) => e.hasResource(url)) ?? this.root;
    const tracked = owner.trackedResource(url);
    const frameSession =
      tracked?.frameId && [...this.children.values()].find((c) => c.type === TARGET_TYPE.iframe && c.targetId === tracked.frameId && c.engine !== owner);
    if (tracked && frameSession) {
      try {
        const content = await withTimeout(frameSession.engine.readNetworkBody(url, tracked.requestId, tracked.mimeType), SETUP_TIMEOUT_MS, 'Reading the iframe document');
        // The parent served (and may have rewritten) this document; it knows the raw upstream hash.
        return { ...content, hash: owner.upstreamHashOf(url) ?? content.hash };
      } catch {
        // Fall through to the owner (and its out-of-page fetch).
      }
    }
    if (owner === this.root) return owner.getResourceContent(url);
    // A stopped service worker answers Network commands only once it runs again.
    try {
      return await withTimeout(owner.getResourceContent(url), SETUP_TIMEOUT_MS, 'Reading the file');
    } catch {
      return this.root.getResourceContent(url);
    }
  }

  /** Live child sessions (for diagnostics and tests). */
  targets(): Array<{ targetId: string; sessionId: string; type: ChildType; parentTargetId?: string; depth: number }> {
    return [...this.children.values()].map((c) => ({
      targetId: c.targetId,
      sessionId: c.sessionId,
      type: c.type,
      depth: c.depth,
      ...(c.parentSessionId ? { parentTargetId: this.children.get(c.parentSessionId)?.targetId } : {}),
    }));
  }

  private engines(): InterceptionEngine[] {
    return [this.root, ...[...this.children.values()].map((c) => c.engine)];
  }

  /** The page's errors propagate; a child's are ignored (its session can vanish or stall mid-call). */
  private async fanOut(task: (engine: InterceptionEngine) => Promise<void>): Promise<void> {
    const page = task(this.root);
    const children = [...this.children.values()].map((c) =>
      withTimeout(task(c.engine), SETUP_TIMEOUT_MS, 'Updating a child session').catch(() => undefined),
    );
    await Promise.all([page, ...children]);
  }

  /** Resolves once every shared worker found so far intercepts (or gave up); undefined when none is pending. */
  private sharedWorkerSetups(): Promise<void> | undefined {
    if (!this.pendingShared.size) return undefined;
    const pending = [...this.pendingShared.values()];
    const all = Promise.all(pending.map((p) => p.done)).then(() => undefined);
    // Given up on after one wait, so a setup that never finishes doesn't hold every later script.
    return withTimeout(all, SHARED_WORKER_HOLD_MS, 'Waiting for a shared worker').catch(() => {
      for (const p of pending) p.settle();
    });
  }

  /**
   * A shared worker is reported before its first script is requested. It is
   * attached at once (in Electron the attach is dispatched inside this call),
   * and its first script is held on its creator's session until the worker's
   * session intercepts: a worker that starts before that never will.
   */
  private onTargetCreated(info: TargetInfo): void {
    // `attached` says whether any client is (DevTools, a test driver), not whether this page's sessions are.
    if (this.detached || info.type !== TARGET_TYPE.sharedWorker) return;
    if (this.browserContextId && info.browserContextId !== this.browserContextId) return;
    if (this.pendingShared.has(info.targetId) || [...this.children.values()].some((c) => c.targetId === info.targetId)) return;
    let settle!: () => void;
    const done = new Promise<void>((resolve) => (settle = resolve));
    this.pendingShared.set(info.targetId, {
      done,
      settle: () => {
        this.pendingShared.delete(info.targetId);
        settle();
      },
    });
    this.cdp
      .send(CDP.Target.attachToTarget, { targetId: info.targetId, flatten: true })
      .catch(() => this.pendingShared.get(info.targetId)?.settle());
  }

  private onAttached(p: AttachedToTarget, parentSessionId: string | undefined): void {
    const { sessionId, targetInfo } = p;
    if (this.children.has(sessionId)) return;
    const parent = parentSessionId === undefined ? undefined : this.children.get(parentSessionId);
    const parentKnown = parentSessionId === undefined || !!parent;
    const type = targetInfo.type;
    const retired = type === TARGET_TYPE.serviceWorker && this.retiredTargets.has(targetInfo.targetId);
    if (this.detached || !parentKnown || retired || (type !== TARGET_TYPE.iframe && !Object.hasOwn(WORKER_SETUP, type))) {
      void this.resume(sessionId);
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
    const depth = (parent?.depth ?? 0) + (type === TARGET_TYPE.iframe ? 1 : 0);
    const common = { sessionId, type: type as ChildType, targetId: targetInfo.targetId, parentSessionId, depth, transport, gone, dispose: [] };
    if (type === TARGET_TYPE.iframe) {
      const engine = new InterceptionEngine({ ...this.engineOptions(), transport, iframe: { id: sessionId, depth } });
      const child: ChildTarget = { ...common, engine };
      this.children.set(sessionId, child);
      void this.setUpIframe(child, parent, targetInfo);
    } else {
      const workerType = type as WorkerType;
      const engine = new InterceptionEngine({
        ...this.engineOptions(),
        transport,
        worker: {
          id: sessionId,
          type: workerType,
          targetId: targetInfo.targetId,
          url: targetInfo.url,
          nested: parent?.type === TARGET_TYPE.worker,
          previous: workerType === TARGET_TYPE.serviceWorker ? this.serviceWorkers.get(targetInfo.targetId) : undefined,
        },
      });
      const child: ChildTarget = { ...common, engine };
      this.children.set(sessionId, child);
      void this.setUpWorker(child, targetInfo);
    }
  }

  private async setUpIframe(child: ChildTarget, parent: ChildTarget | undefined, targetInfo: TargetInfo): Promise<void> {
    const { sessionId, engine, transport } = child;
    try {
      await withTimeout(
        (async () => {
          await engine.attach();
          // Depth counts frames, not sessions: this iframe may sit inside a same-site iframe of its parent.
          const parentEngine = parent?.engine ?? this.root;
          if (engine.parentFrameId) engine.setBaseDepth(parentEngine.frameDepth(engine.parentFrameId) + 1);
          // Nested cross-site iframes, and this iframe's workers, attach through this session.
          if (this.children.get(sessionId) === child) await transport.send(CDP.Target.setAutoAttach, { ...AUTO_ATTACH });
        })(),
        SETUP_TIMEOUT_MS,
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

  /**
   * Sets a worker up and resumes it at once. Everything is sent before the
   * resume and nothing is awaited first: a waiting service or shared worker
   * answers Network commands only once it runs, while Fetch must be on (and
   * Network enabled, to report the worker's first script) before it does. A
   * service worker's Fetch must even go out in this same task: an installed
   * one starting on a new session fetches right away.
   */
  private async setUpWorker(child: ChildTarget, targetInfo: TargetInfo): Promise<void> {
    const { sessionId, engine, transport } = child;
    const type = child.type as WorkerType;
    const setup = WORKER_SETUP[type];
    const replies: Array<Promise<unknown>> = [engine.attach()];
    // Workers this worker starts attach through its session (else they'd never run).
    if (setup.startsWorkers) replies.push(transport.send(CDP.Target.setAutoAttach, { ...AUTO_ATTACH }));
    if (setup.inspector) {
      replies.push(transport.send(CDP.Inspector.enable));
      child.dispose.push(
        // A stopped worker that starts again waits for the debugger, on the same session.
        transport.on(CDP.Inspector.targetReloadedAfterCrash, () => void this.resume(sessionId)),
        // A shared worker ends with its last page; its next instance is found anew and attached before it starts.
        transport.on(CDP.Inspector.targetCrashed, () => {
          if (type === TARGET_TYPE.sharedWorker) this.cdp.send(CDP.Target.detachFromTarget, { sessionId }).catch(() => undefined);
        }),
      );
    }
    if (type === TARGET_TYPE.sharedWorker) void engine.fetchReady.catch(() => undefined).then(() => this.pendingShared.get(targetInfo.targetId)?.settle());
    void this.resume(sessionId);

    const all = Promise.all(replies);
    all.catch(() => undefined);
    try {
      // Only Fetch decides whether overrides apply here; dedicated workers are served on their frame's session.
      await withTimeout(engine.fetchReady, SETUP_TIMEOUT_MS, `Setting up the ${setup.name}`);
    } catch (err) {
      if (this.children.get(sessionId) === child && !(err instanceof SessionGoneError)) {
        this.opts.emit({
          type: 'error',
          message: `Overrides may not apply inside ${setup.name} ${targetInfo.url || targetInfo.targetId}: ${(err as Error).message}`,
        });
      }
    }
    await withTimeout(all, SETUP_TIMEOUT_MS, 'Setting up the worker').catch(() => undefined);
    // In case a command held the worker back.
    if (this.children.get(sessionId) === child) await this.resume(sessionId);
  }

  /** Drops a session and, recursively, every session nested in it (Chromium doesn't always report those). */
  private removeTarget(sessionId: string, notify = true): void {
    const child = this.children.get(sessionId);
    if (!child) return;
    for (const nested of [...this.children.values()]) {
      if (nested.parentSessionId === sessionId) this.removeTarget(nested.sessionId, notify);
    }
    this.children.delete(sessionId);
    for (const dispose of child.dispose.splice(0)) dispose();
    if (child.type === TARGET_TYPE.serviceWorker) this.keepServiceWorker(child);
    child.engine.detach();
    child.gone(new SessionGoneError(sessionId));
    if (child.type === TARGET_TYPE.sharedWorker) this.pendingShared.get(child.targetId)?.settle();
    if (!notify) return;
    this.opts.emit(child.type === TARGET_TYPE.iframe ? { type: 'iframe-detached', iframeId: sessionId } : { type: 'worker-detached', workerId: sessionId });
  }

  /** Remembers a service worker whose session goes away, unless it was unregistered. */
  private keepServiceWorker(child: ChildTarget): void {
    this.serviceWorkers.delete(child.targetId);
    const state = !child.retired && !this.detached && child.engine.serviceWorkerState();
    if (!state) return;
    this.serviceWorkers.set(child.targetId, state);
    if (this.serviceWorkers.size > KEPT_SERVICE_WORKERS) this.serviceWorkers.delete(this.serviceWorkers.keys().next().value!);
  }

  private async resume(sessionId: string): Promise<void> {
    await this.cdp.send(CDP.Runtime.runIfWaitingForDebugger, {}, sessionId).catch(() => undefined);
  }
}
