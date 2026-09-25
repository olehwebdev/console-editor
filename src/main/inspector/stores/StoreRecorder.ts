import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import { BindingRecording } from '../recording/BindingRecording';
import type { RecorderOptions } from '../types';
import { MAX_STORES_PAYLOAD, STORE_HOOK_GLOBAL, STORES_BINDING } from './constants';
import { toStoreActions } from './toStoreActions';

/**
 * Recording the actions of the page's stores in every frame. While on, each
 * session has the binding (`STORES_BINDING`), which the store stand-in sums each
 * action up for and hands them to (`BindingRecording`); when recording starts,
 * every frame's document is asked to find its Vue apps' stores (a document
 * loaded later finds them itself). Each batch is checked, its frame told by the
 * context it came from, and it is sent on in order.
 */
export class StoreRecorder {
  private nextId = 0;
  private readonly binding: BindingRecording;

  constructor(private readonly opts: RecorderOptions) {
    this.binding = new BindingRecording({
      binding: STORES_BINDING,
      maxPayload: MAX_STORES_PAYLOAD,
      sessions: opts.sessions,
      frames: opts.frames,
      announce: (recording) => opts.send({ type: 'stores-recording', recording }),
      received: async (id, _transport, contextId, payload) => this.received(id, contextId, payload),
      started: () => this.binding.inEveryFrame(`window.${STORE_HOOK_GLOBAL} && window.${STORE_HOOK_GLOBAL}.attach()`),
    });
  }

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

  private received(sessionId: SessionKey, contextId: number, payload: string): void {
    const actions = toStoreActions(payload);
    if (!actions.length || !this.binding.active) return;
    const frameId = this.opts.frames.frameOf(sessionId, contextId);
    this.opts.send({ type: 'stores-recorded', actions: actions.map((action) => ({ ...action, id: ++this.nextId, frameId })) });
  }
}
