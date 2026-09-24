import type { CdpTransport } from '../cdp';
import { CDP, TARGET_TYPE } from '../constants';
import { DISCOVER_SHARED_WORKERS, SHARED_WORKER_HOLD_MS } from './constants';
import type { PendingSharedWorker, TargetInfo } from './types';
import { withTimeout } from './withTimeout';

/**
 * A page's shared workers, which aren't auto-attached: found through target
 * discovery (browser-wide, so filtered to the site's browser context) and
 * attached before they start. Until a worker's own session intercepts, its
 * first script is held on its creator's session: one that starts before that
 * never will be.
 */
export class SharedWorkers {
  /** Shared workers found but not yet intercepting, by target id. */
  private readonly pending = new Map<string, PendingSharedWorker>();
  /** The site's browser context. */
  private browserContextId: string | undefined;

  /** `attached`: whether a target already has a session of this page's. */
  constructor(
    private readonly cdp: CdpTransport,
    private readonly stopped: () => boolean,
    private readonly attached: (targetId: string) => boolean,
  ) {}

  /** Follows target creation (on the page's own connection only). Returns the unsubscribers. */
  listen(): Array<() => void> {
    return [
      this.cdp.on(CDP.Target.targetCreated, (p: { targetInfo: TargetInfo }, sessionId) => {
        if (!sessionId) this.created(p.targetInfo);
      }),
      this.cdp.on(CDP.Target.targetDestroyed, (p: { targetId: string }, sessionId) => {
        if (!sessionId) this.settle(p.targetId);
      }),
    ];
  }

  /** Starts discovery. Without it, a shared worker's own loads just aren't intercepted. */
  async discover(): Promise<void> {
    try {
      const { targetInfo } = await this.cdp.send<{ targetInfo: TargetInfo }>(CDP.Target.getTargetInfo);
      this.browserContextId = targetInfo.browserContextId;
      await this.cdp.send(CDP.Target.setDiscoverTargets, DISCOVER_SHARED_WORKERS);
    } catch {
      // Left without shared worker interception.
    }
  }

  /** Stops discovery and lets every held script go. */
  stop(): void {
    for (const pending of [...this.pending.values()]) pending.settle();
    this.cdp.send(CDP.Target.setDiscoverTargets, { discover: false }).catch(() => undefined);
  }

  /** A shared worker intercepts, or went away: its first script may go. */
  settle(targetId: string): void {
    this.pending.get(targetId)?.settle();
  }

  /** Resolves once every shared worker found so far intercepts (or was given up on); undefined when none is pending. */
  setups(): Promise<void> | undefined {
    if (!this.pending.size) return undefined;
    const pending = [...this.pending.values()];
    const all = Promise.all(pending.map((p) => p.done)).then(() => undefined);
    // Given up on after one wait, so a setup that never finishes doesn't hold every later script.
    return withTimeout(all, SHARED_WORKER_HOLD_MS, 'Waiting for a shared worker').catch(() => {
      for (const p of pending) p.settle();
    });
  }

  /**
   * A shared worker is reported before its first script is requested. It is
   * attached at once (in Electron the attach is dispatched inside this call);
   * its session is then set up like any worker's.
   */
  private created(info: TargetInfo): void {
    // `info.attached` says whether any client is (DevTools, a test driver), not whether this page's sessions are.
    if (this.stopped() || info.type !== TARGET_TYPE.sharedWorker) return;
    if (this.browserContextId && info.browserContextId !== this.browserContextId) return;
    if (this.pending.has(info.targetId) || this.attached(info.targetId)) return;
    let settle!: () => void;
    const done = new Promise<void>((resolve) => (settle = resolve));
    this.pending.set(info.targetId, {
      done,
      settle: () => {
        this.pending.delete(info.targetId);
        settle();
      },
    });
    this.cdp.send(CDP.Target.attachToTarget, { targetId: info.targetId, flatten: true }).catch(() => this.settle(info.targetId));
  }
}
