import type { CodeLocation } from '../../../shared/types';
import type { SessionKey } from '../../console/ConsoleFrames';
import type { CdpTransport } from '../../engine/cdp';
import { MAX_LOCATED_DOCUMENTS, MAX_RENDERS_PAYLOAD, RENDERS_BINDING, RENDERS_GROUP_PREFIX } from '../constants';
import { BindingRecording } from '../recording/BindingRecording';
import type { RecorderOptions } from '../types';
import { locateTypes } from './locateTypes';
import { toRenderCommits } from './toRenderCommits';

/**
 * Recording React's commits in every frame. While on, each session has the
 * binding (`RENDERS_BINDING`), which the hook stand-in sums its commits up for
 * and hands them to (`BindingRecording`). Each batch is checked, its component
 * functions located (once per document), its frame told by the context it came
 * from, and it is sent on in order.
 */
export class RenderRecorder {
  private nextId = 0;
  private groups = 0;
  /** Per document (session and context): where each component function its commits named is defined. */
  private readonly located = new Map<string, Map<number, CodeLocation | null>>();
  private readonly binding: BindingRecording;

  constructor(private readonly opts: RecorderOptions) {
    this.binding = new BindingRecording({
      binding: RENDERS_BINDING,
      maxPayload: MAX_RENDERS_PAYLOAD,
      sessions: opts.sessions,
      frames: opts.frames,
      announce: (recording) => opts.send({ type: 'renders-recording', recording }),
      received: (id, transport, contextId, payload) => this.received(id, transport, contextId, payload),
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

  /** A session went away, and its documents with it. */
  forget(sessionId: SessionKey): void {
    for (const key of [...this.located.keys()]) if (key.startsWith(`${String(sessionId)}:`)) this.located.delete(key);
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
    if (!this.binding.active) return;
    const frameId = this.opts.frames.frameOf(sessionId, contextId);
    this.opts.send({
      type: 'renders-recorded',
      commits: commits.map((commit) => ({ ...commit, id: ++this.nextId, frameId, components: commit.components.map(({ type, ...c }) => ({ ...c, location: known.get(type) ?? null })) })),
    });
  }
}
