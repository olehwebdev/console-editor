import type { AppEvent, Settings } from '../../shared/types';
import { ConsoleService } from '../console';
import type { SessionKey } from '../console/ConsoleFrames';
import type { CdpTransport } from '../engine/cdp';
import type { SessionObserver } from '../engine/PageInterception';
import { InspectorService } from '../inspector';

/**
 * What runs in the page's frames besides interception: the console, and the
 * inspector, which looks at the frames the console records. Interception hands
 * each session to both through this one observer.
 */
export class FrameServices implements SessionObserver {
  readonly console: ConsoleService;
  readonly inspector: InspectorService;

  constructor(getSettings: () => Settings, send: (event: AppEvent) => void) {
    this.console = new ConsoleService({ getSettings, send });
    this.inspector = new InspectorService({ getSettings, send, frames: this.console.frames });
  }

  /** Each sets up on its own: one failing doesn't keep the other off the session. */
  async attached(id: SessionKey, transport: CdpTransport): Promise<void> {
    await Promise.all([this.console.attached(id, transport).catch(() => undefined), this.inspector.attached(id, transport).catch(() => undefined)]);
  }

  /** The console first: the inspector drops the stacks of the frames it no longer lists. */
  detached(id: SessionKey): void {
    this.console.detached(id);
    this.inspector.detached(id);
  }

  /** The console first: frames it starts recording are looked at once it knows them. */
  async applySettings(): Promise<void> {
    await this.console.applySettings();
    await this.inspector.applySettings();
  }
}
