import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import type { BindingRecordingOptions } from '../types';

/**
 * Recording what the framework hooks hear through a binding (`Runtime.addBinding`)
 * in every frame: while on, each session has the binding, one that attaches too,
 * and its being in a document is what turns the hook's recording on. The binding
 * only takes while the console's Runtime domain is on. Batches are handled one
 * after another, so they keep their order. Stopping takes the binding's function
 * out of the documents already loaded (removing a binding leaves it there).
 */
export class BindingRecording {
  private on = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly opts: BindingRecordingOptions) {}

  get active(): boolean {
    return this.on;
  }

  listen(id: SessionKey, transport: CdpTransport): Array<() => void> {
    return [
      transport.on(CDP.Runtime.bindingCalled, (p: { name: string; payload: string; executionContextId: number }) => {
        if (p.name !== this.opts.binding || !this.on || p.payload.length > this.opts.maxPayload) return;
        this.queue = this.queue.then(() => this.opts.received(id, transport, p.executionContextId, p.payload)).catch(() => undefined);
      }),
    ];
  }

  /** A session that arrives while recording records too. */
  async joined(transport: CdpTransport): Promise<void> {
    if (this.on) await transport.send(CDP.Runtime.addBinding, { name: this.opts.binding }).catch(() => undefined);
  }

  async set(on: boolean): Promise<void> {
    if (on === this.on) return;
    this.on = on;
    this.opts.announce(on);
    await (on ? this.start() : this.stop());
  }

  /** The console records again: its Runtime domain is on, so the binding can take. */
  async resume(): Promise<void> {
    if (this.on) await this.start();
  }

  /** Runs an expression in every frame's document (its main world), silently. */
  async inEveryFrame(expression: string): Promise<void> {
    const { frames, sessions } = this.opts;
    await Promise.all(
      frames.list().map((frame) => {
        const target = frames.target(frame.id);
        const session = target && sessions.get(target.sessionId);
        return session?.transport.send(CDP.Runtime.evaluate, { expression, uniqueContextId: target!.uniqueId, silent: true }).catch(() => undefined);
      }),
    );
  }

  private async start(): Promise<void> {
    await Promise.all(this.opts.sessions.all().map(([, session]) => session.transport.send(CDP.Runtime.addBinding, { name: this.opts.binding }).catch(() => undefined)));
    await this.opts.started?.();
  }

  private async stop(): Promise<void> {
    await Promise.all(this.opts.sessions.all().map(([, session]) => session.transport.send(CDP.Runtime.removeBinding, { name: this.opts.binding }).catch(() => undefined)));
    await this.inEveryFrame(`delete window.${this.opts.binding}`);
  }
}
