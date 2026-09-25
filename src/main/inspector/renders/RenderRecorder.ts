import type { CodeLocation } from '../../../shared/types';
import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { MAX_LOCATED_DOCUMENTS, MAX_RENDERS_PAYLOAD, RENDERS_BINDING, RENDERS_GROUP_PREFIX } from '../constants';
import type { RenderRecorderOptions } from '../types';
import { locateTypes } from './locateTypes';
import { toRenderCommits } from './toRenderCommits';

/**
 * Recording React's commits in every frame. While on, each session has the
 * binding (`RENDERS_BINDING`), which the hook stand-in sums its commits up for
 * and hands them to; the binding only takes while the console's Runtime domain
 * is on. Each batch is checked, its component functions located (once per
 * document), its frame told by the context it came from, and it is sent on in
 * order. Stopping takes the binding's function out of documents already loaded.
 */
export class RenderRecorder {
  private recording = false;
  private nextId = 0;
  private groups = 0;
  /** Per document (session and context): where each component function its commits named is defined. */
  private readonly located = new Map<string, Map<number, CodeLocation | null>>();
  /** Batches are handled one after another, so commits keep their order. */
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly opts: RenderRecorderOptions) {}

  get active(): boolean {
    return this.recording;
  }

  listen(id: SessionKey, transport: CdpTransport): Array<() => void> {
    return [
      transport.on(CDP.Runtime.bindingCalled, (p: { name: string; payload: string; executionContextId: number }) => {
        if (p.name !== RENDERS_BINDING || !this.recording || p.payload.length > MAX_RENDERS_PAYLOAD) return;
        this.queue = this.queue.then(() => this.received(id, transport, p.executionContextId, p.payload)).catch(() => undefined);
      }),
    ];
  }

  /** A session that arrives while recording records too. */
  async joined(transport: CdpTransport): Promise<void> {
    if (this.recording) await transport.send(CDP.Runtime.addBinding, { name: RENDERS_BINDING }).catch(() => undefined);
  }

  async set(on: boolean): Promise<void> {
    if (on === this.recording) return;
    this.recording = on;
    this.opts.send({ type: 'renders-recording', recording: on });
    await (on ? this.bindAll() : this.unbindAll());
  }

  /** The console records again: its Runtime domain is on, so the binding can take. */
  async resume(): Promise<void> {
    if (this.recording) await this.bindAll();
  }

  /** A session went away, and its documents with it. */
  forget(sessionId: SessionKey): void {
    for (const key of [...this.located.keys()]) if (key.startsWith(`${String(sessionId)}:`)) this.located.delete(key);
  }

  private async bindAll(): Promise<void> {
    await Promise.all(this.opts.sessions.all().map(([, session]) => session.transport.send(CDP.Runtime.addBinding, { name: RENDERS_BINDING }).catch(() => undefined)));
  }

  private async unbindAll(): Promise<void> {
    await Promise.all(this.opts.sessions.all().map(([, session]) => session.transport.send(CDP.Runtime.removeBinding, { name: RENDERS_BINDING }).catch(() => undefined)));
    // Removing a binding leaves its function in the documents it was put in, and the stand-in sums up while it is there.
    await Promise.all(
      this.opts.frames.list().map((frame) => {
        const target = this.opts.frames.target(frame.id);
        const session = target && this.opts.sessions.get(target.sessionId);
        return session?.transport.send(CDP.Runtime.evaluate, { expression: `delete window.${RENDERS_BINDING}`, uniqueContextId: target!.uniqueId, silent: true }).catch(() => undefined);
      }),
    );
  }

  private async received(sessionId: SessionKey, transport: CdpTransport, contextId: number, payload: string): Promise<void> {
    const commits = toRenderCommits(payload);
    const session = this.opts.sessions.get(sessionId);
    if (!commits.length || !session) return;
    const key = `${String(sessionId)}:${contextId}`;
    const known = this.located.get(key) ?? new Map<number, CodeLocation | null>();
    const unknown = [...new Set(commits.flatMap((commit) => commit.components.map((c) => c.type)))].filter((id) => id >= 0 && !known.has(id));
    if (unknown.length) {
      for (const [id, location] of await locateTypes(transport, contextId, unknown, session.scripts, `${RENDERS_GROUP_PREFIX}${++this.groups}`)) known.set(id, location);
    }
    // Most recently used last: the oldest documents are dropped first.
    this.located.delete(key);
    this.located.set(key, known);
    while (this.located.size > MAX_LOCATED_DOCUMENTS) this.located.delete(this.located.keys().next().value!);
    if (!this.recording) return;
    const frameId = this.opts.frames.frameOf(sessionId, contextId);
    this.opts.send({
      type: 'renders-recorded',
      commits: commits.map((commit) => ({ ...commit, id: ++this.nextId, frameId, components: commit.components.map(({ type, ...c }) => ({ ...c, location: known.get(type) ?? null })) })),
    });
  }
}
