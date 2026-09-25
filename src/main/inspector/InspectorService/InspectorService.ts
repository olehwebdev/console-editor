import type { ComponentTreeLevel, FrameStack, InspectedComponent } from '../../../shared/types';
import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import type { SessionObserver } from '../../engine/PageInterception';
import { HookScript } from '../HookScript';
import { listenForLoads } from '../listenForLoads';
import { Picker } from '../picking/Picker';
import { ComponentReader } from '../reading/ComponentReader';
import { ScriptUrls } from '../reading/ScriptUrls';
import { TreeReader } from '../reading/TreeReader';
import { RenderRecorder } from '../renders/RenderRecorder';
import { StackTracker } from '../StackTracker';
import type { InspectedSession, InspectedSessions, InspectorServiceOptions } from '../types';

/**
 * The inspector of the page's frames. It rides on the sessions interception has,
 * as the console does, and coordinates: the page stack (what each frame runs),
 * picking an element in any frame, and reading the component that rendered it.
 * While **Framework hooks** is on, it also puts the hooks (`REACT_HOOK_SOURCE`)
 * in every new document, before the page's own scripts.
 */
export class InspectorService implements SessionObserver {
  private readonly sessions = new Map<SessionKey, InspectedSession>();
  private readonly stacks: StackTracker;
  private readonly picker: Picker;
  private readonly reader: ComponentReader;
  private readonly tree: TreeReader;
  private readonly renders: RenderRecorder;
  private recording: boolean;

  constructor(private readonly opts: InspectorServiceOptions) {
    const sessions: InspectedSessions = { get: (id) => this.sessions.get(id), all: () => [...this.sessions] };
    this.stacks = new StackTracker({ sessions, frames: opts.frames, send: opts.send });
    this.picker = new Picker({ sessions, send: opts.send, picked: (id, node) => void this.picked(id, node) });
    this.reader = new ComponentReader(sessions);
    this.tree = new TreeReader(sessions, opts.frames, this.reader);
    this.renders = new RenderRecorder({ sessions, frames: opts.frames, send: opts.send });
    this.recording = opts.getSettings().captureConsole;
  }

  async attached(id: SessionKey, transport: CdpTransport): Promise<void> {
    const hook = new HookScript(transport);
    const dispose = [...listenForLoads(transport, this.stacks.sinks), ...this.picker.listen(id, transport), ...this.renders.listen(id, transport)];
    this.sessions.set(id, { transport, hook, scripts: new ScriptUrls(transport), dispose });
    await Promise.all([hook.sync(this.opts.getSettings().frameworkHooks), this.picker.joined(transport), this.renders.joined(transport)]);
  }

  detached(id: SessionKey): void {
    // The page's own session: interception stopped, and every session with it.
    const gone = id === undefined ? [...this.sessions.keys()] : [id];
    for (const key of gone) {
      for (const dispose of this.sessions.get(key)?.dispose.splice(0) ?? []) dispose();
      this.sessions.delete(key);
      this.reader.dropSession(key);
      this.renders.forget(key);
    }
    this.stacks.publish();
  }

  /** Installs or removes the hooks; once the console records again, every frame is looked at (their contexts are known then). */
  async applySettings(): Promise<void> {
    const { frameworkHooks, captureConsole } = this.opts.getSettings();
    const started = captureConsole && !this.recording;
    this.recording = captureConsole;
    await Promise.all([...this.sessions.values()].map(({ hook }) => hook.sync(frameworkHooks).catch(() => undefined)));
    if (started) await Promise.all([this.stacks.scan(), this.renders.resume()]);
    else if (!captureConsole) this.stacks.publish();
  }

  /** Every frame's stack, the top page first. */
  list(): FrameStack[] {
    return this.stacks.list();
  }

  scan(): Promise<void> {
    return this.stacks.scan();
  }

  startPicking(): Promise<void> {
    return this.picker.start();
  }

  stopPicking(): Promise<void> {
    return this.picker.stop();
  }

  togglePicking(): Promise<void> {
    return this.picker.active ? this.picker.stop() : this.picker.start();
  }

  inspectComponent(pickId: unknown, depth: unknown): Promise<InspectedComponent> {
    return this.reader.describe(pickId, depth);
  }

  setComponentState(pickId: unknown, depth: unknown, edit: unknown): Promise<InspectedComponent> {
    return this.reader.setState(pickId, depth, edit);
  }

  highlightPick(pickId: unknown): Promise<void> {
    return this.reader.highlight(pickId);
  }

  get recordingRenders(): boolean {
    return this.renders.active;
  }

  recordRenders(on: boolean): Promise<void> {
    return this.renders.set(on);
  }

  componentTree(frameId: unknown, path: unknown): Promise<ComponentTreeLevel | null> {
    return this.tree.level(frameId, path);
  }

  openTreeNode(frameId: unknown, path: unknown): Promise<InspectedComponent> {
    return this.tree.open(frameId, path);
  }

  highlightTreeNode(frameId: unknown, path: unknown): Promise<void> {
    return this.tree.highlight(frameId, path);
  }

  private async picked(id: SessionKey, backendNodeId: number): Promise<void> {
    try {
      this.opts.send({ type: 'inspect-picked', component: await this.reader.pick(id, backendNodeId) });
    } catch (err) {
      this.opts.send({ type: 'error', message: `Couldn't read the element you picked: ${(err as Error).message}` });
    }
  }
}
