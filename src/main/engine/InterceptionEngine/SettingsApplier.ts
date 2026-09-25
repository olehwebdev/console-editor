import { NETWORK_CONDITIONS } from '../../../shared/throttling';
import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { computeFetchPatterns } from './computeFetchPatterns';
import type { OverrideMatcher } from './OverrideMatcher';
import { SerialQueue } from './SerialQueue';
import { SriGuard } from './SriGuard';
import type { EngineOptions, SessionSettings } from './types';

/**
 * Applies the settings (cache, service workers, network speed, CSP, SRI guard) to one CDP
 * session and keeps its `Fetch` interception patterns current, one change at a time.
 */
export class SettingsApplier implements SessionSettings {
  private fetchEnabled = false;
  private readonly queue = new SerialQueue();
  private readonly sriGuard: SriGuard;

  constructor(
    private readonly cdp: CdpTransport,
    private readonly opts: Pick<EngineOptions, 'getOverrides' | 'getRules' | 'getSettings' | 'getBreakpoints'>,
    private readonly matcher: OverrideMatcher,
  ) {
    this.sriGuard = new SriGuard(cdp);
  }

  /** Re-applies settings (cache, service workers, CSP) and interception patterns. */
  apply(): Promise<void> {
    return this.queue.run(async () => {
      const s = this.opts.getSettings();
      await this.cdp.send(CDP.Network.setCacheDisabled, { cacheDisabled: s.disableCache });
      await this.cdp.send(CDP.Network.setBypassServiceWorker, { bypass: s.bypassServiceWorker });
      await this.cdp.send(CDP.Network.emulateNetworkConditions, { ...NETWORK_CONDITIONS[s.throttling] });
      await this.cdp.send(CDP.Page.setBypassCSP, { enabled: s.bypassCSP });
      await this.sriGuard.sync(s.stripIntegrity);
      await this.updatePatterns();
    });
  }

  /** Recomputes the interception patterns (the overrides or rules changed). */
  refresh(): Promise<void> {
    return this.queue.run(() => this.updatePatterns());
  }

  /** Stops pausing requests, without waiting for (or minding) the answer. */
  stop(): void {
    if (this.fetchEnabled) {
      this.fetchEnabled = false;
      this.cdp.send(CDP.Fetch.disable).catch(() => undefined);
    }
  }

  private async updatePatterns(): Promise<void> {
    this.matcher.clear();
    const patterns = computeFetchPatterns(this.opts.getOverrides(), this.opts.getRules(), this.opts.getSettings(), this.opts.getBreakpoints?.());
    if (patterns.length === 0) {
      if (this.fetchEnabled) {
        await this.cdp.send(CDP.Fetch.disable);
        this.fetchEnabled = false;
      }
      return;
    }
    await this.cdp.send(CDP.Fetch.enable, { patterns });
    this.fetchEnabled = true;
  }
}
