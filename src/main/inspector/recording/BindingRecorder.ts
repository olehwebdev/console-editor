import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import type { BindingRecording } from './BindingRecording';

/**
 * A recorder over a page binding (renders, store actions): the inspector turns it on and off, and hands it each
 * session, the same way for each, through its `BindingRecording`.
 */
export abstract class BindingRecorder {
  protected abstract readonly binding: BindingRecording;

  get active(): boolean {
    return this.binding.active;
  }

  listen(id: SessionKey, transport: CdpTransport): Array<() => void> {
    return this.binding.listen(id, transport);
  }

  joined(transport: CdpTransport): Promise<void> {
    return this.binding.joined(transport);
  }

  set(on: boolean): Promise<void> {
    return this.binding.set(on);
  }

  resume(): Promise<void> {
    return this.binding.resume();
  }
}
