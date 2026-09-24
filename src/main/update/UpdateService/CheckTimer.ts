import { CHECK_INTERVAL_MS } from './constants';

/** Runs the automatic checks: once after a delay, then every `CHECK_INTERVAL_MS`, while `enabled` says so. */
export class CheckTimer {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly check: () => Promise<unknown>,
    private readonly enabled: () => boolean,
  ) {}

  /** Starts (or restarts, or stops) the checks: the next one runs after `delay` ms. */
  schedule(delay: number): void {
    this.stop();
    if (!this.enabled()) return;
    this.timer = setTimeout(() => {
      void this.check().finally(() => this.schedule(CHECK_INTERVAL_MS));
    }, delay);
  }

  stop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
