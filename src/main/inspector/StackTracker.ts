import type { FrameStack } from '../../shared/types';
import { DETECT_DELAY_MS } from './constants';
import { detectFrame } from './detectFrame';
import type { LoadSinks, StackTrackerOptions } from './types';

/**
 * The page stack: a moment after a frame loads, the detector runs in its main
 * world (where the console's frames and contexts say) and finds its UI library,
 * framework, state library and bundler. A frame's stack goes with its document.
 */
export class StackTracker {
  private readonly stacks = new Map<string, FrameStack>();
  /** Frames waiting to be looked at, `DETECT_DELAY_MS` after they loaded. */
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();
  /** What a session's frame loads tell it. */
  readonly sinks: LoadSinks = { loaded: (frameId) => this.schedule(frameId), gone: (frameId) => this.forget(frameId) };

  constructor(private readonly opts: StackTrackerOptions) {}

  /** Every frame's stack, the top page first. */
  list(): FrameStack[] {
    return this.opts.frames.list().flatMap((frame) => this.stacks.get(frame.id) ?? []);
  }

  /** Looks at every frame now. */
  async scan(): Promise<void> {
    await Promise.all(this.opts.frames.list().map((frame) => this.detect(frame.id)));
  }

  /** Sends every frame's stack; a frame the console no longer lists goes. */
  publish(): void {
    const listed = new Set(this.opts.frames.list().map((frame) => frame.id));
    for (const frameId of this.stacks.keys()) {
      if (!listed.has(frameId)) this.stacks.delete(frameId);
    }
    this.opts.send({ type: 'stack-changed', stacks: this.list() });
  }

  private schedule(frameId: string): void {
    clearTimeout(this.pending.get(frameId));
    this.pending.set(frameId, setTimeout(() => void this.detect(frameId), DETECT_DELAY_MS));
  }

  /** A frame's document is gone, and what it ran with it. */
  private forget(frameId: string): void {
    clearTimeout(this.pending.get(frameId));
    this.pending.delete(frameId);
    if (this.stacks.delete(frameId)) this.publish();
  }

  private async detect(frameId: string): Promise<void> {
    clearTimeout(this.pending.get(frameId));
    this.pending.delete(frameId);
    const target = this.opts.frames.target(frameId);
    const session = target && this.opts.sessions.get(target.sessionId);
    if (!target || !session) return;
    const hits = await detectFrame(session.transport, target.uniqueId);
    // The frame may have loaded another document meanwhile: that one gets a look of its own.
    if (!hits || this.opts.frames.target(frameId)?.uniqueId !== target.uniqueId) return;
    const url = this.opts.frames.list().find((f) => f.id === frameId)?.url ?? '';
    this.stacks.set(frameId, { frameId, url, hits, scannedAt: Date.now() });
    this.publish();
  }
}
