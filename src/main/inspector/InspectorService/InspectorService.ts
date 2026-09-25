import type { FrameStack } from '../../../shared/types';
import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import type { SessionObserver } from '../../engine/PageInterception';
import { DETECT_DELAY_MS } from '../constants';
import { detectFrame } from '../detectFrame';
import { HookScript } from '../HookScript';
import { listenForLoads } from '../listenForLoads';
import type { InspectedSession, InspectorServiceOptions } from '../types';

/**
 * What the page's frames run (the page stack): a moment after a frame loads, a
 * detector in its main world finds its UI library, framework, state library and
 * bundler. It rides on the sessions interception has, as the console does, and
 * runs code where the console's frames and contexts say; while **Framework
 * hooks** is on, it also puts the hooks (`REACT_HOOK_SOURCE`) in every new
 * document, before the page's own scripts.
 */
export class InspectorService implements SessionObserver {
  private readonly sessions = new Map<SessionKey, InspectedSession>();
  private readonly stacks = new Map<string, FrameStack>();
  /** Frames waiting to be looked at, `DETECT_DELAY_MS` after they loaded. */
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();
  private recording: boolean;

  constructor(private readonly opts: InspectorServiceOptions) {
    this.recording = opts.getSettings().captureConsole;
  }

  async attached(id: SessionKey, transport: CdpTransport): Promise<void> {
    const hook = new HookScript(transport);
    const dispose = listenForLoads(transport, { loaded: (frameId) => this.schedule(frameId), gone: (frameId) => this.forget(frameId) });
    this.sessions.set(id, { transport, hook, dispose });
    await hook.sync(this.opts.getSettings().frameworkHooks);
  }

  detached(id: SessionKey): void {
    // The page's own session: interception stopped, and every session with it.
    const gone = id === undefined ? [...this.sessions.keys()] : [id];
    for (const key of gone) {
      for (const dispose of this.sessions.get(key)?.dispose.splice(0) ?? []) dispose();
      this.sessions.delete(key);
    }
    this.publish();
  }

  /** Installs or removes the hooks; once the console records again, every frame is looked at (their contexts are known then). */
  async applySettings(): Promise<void> {
    const { frameworkHooks, captureConsole } = this.opts.getSettings();
    const started = captureConsole && !this.recording;
    this.recording = captureConsole;
    await Promise.all([...this.sessions.values()].map(({ hook }) => hook.sync(frameworkHooks).catch(() => undefined)));
    if (started) await this.scan();
    else if (!captureConsole) this.publish();
  }

  /** Every frame's stack, the top page first. */
  list(): FrameStack[] {
    return this.opts.frames.list().flatMap((frame) => this.stacks.get(frame.id) ?? []);
  }

  /** Looks at every frame now. */
  async scan(): Promise<void> {
    await Promise.all(this.opts.frames.list().map((frame) => this.detect(frame.id)));
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
    const session = target && this.sessions.get(target.sessionId);
    if (!target || !session) return;
    const hits = await detectFrame(session.transport, target.uniqueId);
    // The frame may have loaded another document meanwhile: that one gets a look of its own.
    if (!hits || this.opts.frames.target(frameId)?.uniqueId !== target.uniqueId) return;
    const url = this.opts.frames.list().find((f) => f.id === frameId)?.url ?? '';
    this.stacks.set(frameId, { frameId, url, hits, scannedAt: Date.now() });
    this.publish();
  }

  /** Sends every frame's stack; a frame the console no longer lists goes. */
  private publish(): void {
    const listed = new Set(this.opts.frames.list().map((frame) => frame.id));
    for (const frameId of this.stacks.keys()) {
      if (!listed.has(frameId)) this.stacks.delete(frameId);
    }
    this.opts.send({ type: 'stack-changed', stacks: this.list() });
  }
}
