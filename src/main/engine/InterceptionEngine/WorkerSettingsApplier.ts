import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { NETWORK_BUFFERS } from './constants';
import type { OverrideMatcher } from './OverrideMatcher';
import { SerialQueue } from './SerialQueue';
import type { CdpCommand, EngineOptions, SessionSettings, WorkerSession } from './types';
import { workerFetchPatterns } from './workerFetchPatterns';

/**
 * A worker session's settings and `Fetch` patterns. Its page's settings don't
 * reach what workers load, so each worker session takes its own (see
 * `WorkerSession`). A waiting service or shared worker answers Network
 * commands only once it runs, so they are never awaited before it resumes.
 */
export class WorkerSettingsApplier implements SessionSettings {
  private fetchEnabled = false;
  private readonly queue = new SerialQueue();
  /** Resolves once Fetch is enabled on the session (at once for a session without Fetch). */
  fetchReady: Promise<void> = Promise.resolve();

  constructor(
    private readonly cdp: CdpTransport,
    private readonly opts: Pick<EngineOptions, 'getOverrides' | 'getRules' | 'getSettings'>,
    private readonly matcher: OverrideMatcher,
    private readonly session: WorkerSession,
  ) {}

  /**
   * Sends every setup command at once, Fetch first, and returns their replies
   * without having awaited any: the caller resumes the worker right after.
   */
  start(): Promise<void> {
    const replies: Promise<unknown>[] = [];
    if (this.session.fetch) {
      this.fetchReady = this.enableFetch();
      replies.push(this.fetchReady);
    }
    replies.push(this.cdp.send(CDP.Network.enable, NETWORK_BUFFERS));
    for (const [method, params] of this.commands()) replies.push(this.cdp.send(method, params));
    return Promise.all(replies).then(() => undefined);
  }

  apply(): Promise<void> {
    return this.queue.run(async () => {
      // Not awaited: a stopped service worker answers Network commands only once it runs again.
      for (const [method, params] of this.commands()) this.cdp.send(method, params).catch(() => undefined);
      await this.refreshPatterns();
    });
  }

  refresh(): Promise<void> {
    return this.queue.run(() => this.refreshPatterns());
  }

  stop(): void {
    if (this.fetchEnabled) {
      this.fetchEnabled = false;
      this.cdp.send(CDP.Fetch.disable).catch(() => undefined);
    }
  }

  private commands(): CdpCommand[] {
    return this.session.settings(this.opts.getSettings());
  }

  private async refreshPatterns(): Promise<void> {
    if (this.session.fetch) await this.enableFetch();
  }

  /**
   * Enables Fetch; sent at once. Never disabled while the worker lives: a
   * shared worker whose session had Fetch off (or no patterns) is never paused
   * again.
   */
  private enableFetch(): Promise<void> {
    this.matcher.clear();
    this.fetchEnabled = true;
    const patterns = workerFetchPatterns(this.opts.getOverrides(), this.opts.getRules(), this.opts.getSettings());
    return this.cdp.send(CDP.Fetch.enable, { patterns }).then(() => undefined);
  }
}
