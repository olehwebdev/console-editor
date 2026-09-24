import type { ConsoleEntry, ConsoleFrame, ConsoleProperty } from '../../../shared/types';
import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { IFRAME_SETUP_TIMEOUT_MS, withTimeout, type SessionObserver } from '../../engine/PageInterception';
import { ConsoleFrames, type SessionKey } from '../ConsoleFrames';
import { ACCESSOR_VALUE, MAX_PROPERTIES } from '../constants';
import type { ConsoleSession, PageFrameTree } from '../types';
import { BatchSender } from './BatchSender';
import { discardEntries } from './discardEntries';
import { EntryLog } from './EntryLog';
import { evaluateInContext } from './evaluateInContext';
import { exceptionRow } from './exceptionRow';
import { listenToSession } from './listenToSession';
import { ownProperties } from './ownProperties';
import { stopRecording } from './stopRecording';
import { textRow } from './textRow';
import type { ConsoleServiceOptions, RowDraft } from './types';

/**
 * The console of the page and every frame in it: it records their logs,
 * errors and the browser's messages as one stream, and runs code in any frame.
 *
 * It rides on the CDP sessions interception already has (one for the page, one
 * per out-of-process iframe): `PageInterception` hands each one over while an
 * iframe is still paused, so a frame's first log line is caught too. Rows and
 * frame changes reach the renderer in batches; the most recent
 * `MAX_CONSOLE_ENTRIES` rows are kept for a renderer that (re)starts.
 */
export class ConsoleService implements SessionObserver {
  private readonly sessions = new Map<SessionKey, ConsoleSession>();
  private readonly batch = new BatchSender((event) => this.opts.send(event), () => this.listFrames());
  private readonly frames = new ConsoleFrames(() => this.batch.framesChanged());
  private readonly log = new EntryLog();
  private recording: boolean;

  constructor(private readonly opts: ConsoleServiceOptions) {
    this.recording = opts.getSettings().captureConsole;
  }

  async attached(id: SessionKey, transport: CdpTransport): Promise<void> {
    const dispose = listenToSession(id, transport, {
      frames: this.frames,
      recording: () => this.recording,
      push: (row) => this.push(row),
      value: this.log.valueIn(id),
    });
    this.sessions.set(id, { transport, dispose });
    if (this.recording) await this.start(id, transport);
  }

  detached(id: SessionKey): void {
    // The page's own session: interception stopped, and every session with it.
    const gone = id === undefined ? [...this.sessions.keys()] : [id];
    for (const key of gone) {
      for (const dispose of this.sessions.get(key)?.dispose.splice(0) ?? []) dispose();
      this.sessions.delete(key);
      this.frames.sessionGone(key);
    }
  }

  /** Starts or stops recording, as the setting now says. */
  async applySettings(): Promise<void> {
    const recording = this.opts.getSettings().captureConsole;
    if (recording === this.recording) return;
    this.recording = recording;
    if (!recording) {
      for (const { transport } of this.sessions.values()) stopRecording(transport);
      this.frames.clear();
      return;
    }
    // A frame that doesn't answer (busy in a loop) must not hold the setting up.
    await Promise.all(
      [...this.sessions].map(([id, { transport }]) => withTimeout(this.start(id, transport), IFRAME_SETUP_TIMEOUT_MS, 'Recording a frame').catch(() => undefined)),
    );
  }

  listFrames(): ConsoleFrame[] {
    return this.recording ? this.frames.list() : [];
  }

  listEntries(): ConsoleEntry[] {
    return this.log.list();
  }

  /** Runs `code` in a frame's main world, as DevTools' console does (top-level `await`, `$0`, `copy()`). */
  async evaluate(frameId: unknown, code: unknown): Promise<ConsoleEntry> {
    if (typeof frameId !== 'string' || typeof code !== 'string') throw new Error('A frame id and code are needed');
    const target = this.frames.target(frameId);
    const session = target && this.sessions.get(target.sessionId);
    if (!target || !session) throw new Error('That frame has no JavaScript running.');
    this.push(textRow({ frameId, level: 'info', source: 'input' }, code));
    const value = this.log.valueIn(target.sessionId);
    try {
      const reply = await evaluateInContext(session.transport, target.uniqueId, code);
      if (reply.exceptionDetails) return this.push(exceptionRow(frameId, 'result', reply.exceptionDetails, value));
      return this.push({ entry: { frameId, level: 'info', source: 'result' }, values: (entryId) => [value(entryId, reply.result)] });
    } catch (err) {
      // The frame navigated or went away while it ran.
      return this.push(textRow({ frameId, level: 'error', source: 'result' }, (err as Error).message));
    }
  }

  /** One level of an expandable value's properties. */
  async properties(handle: unknown): Promise<ConsoleProperty[]> {
    const target = typeof handle === 'number' ? this.log.handle(handle) : undefined;
    const session = target && this.sessions.get(target.sessionId);
    const gone = new Error('That value is no longer available: its frame has moved on.');
    if (!target || !session) throw gone;
    const reply = await ownProperties(session.transport, target.objectId);
    // The row may have been cleared or dropped off meanwhile: nothing would free what it kept.
    if (!reply || reply.exceptionDetails || !this.log.holds(target.entryId)) throw gone;
    return [...reply.result, ...(reply.internalProperties ?? [])].slice(0, MAX_PROPERTIES).map((p) => ({
      name: p.name,
      value: p.value ? this.log.value(target.sessionId, target.entryId, p.value) : ACCESSOR_VALUE,
    }));
  }

  /** Drops every row, and the page-side values they kept alive. */
  async clear(): Promise<void> {
    this.log.clear();
    this.batch.clear();
    this.opts.send({ type: 'console-cleared' });
    await Promise.all([...this.sessions.values()].map(({ transport }) => discardEntries(transport)));
  }

  /** Sends what is waiting now, instead of at the end of the batch. */
  flush(): void {
    this.batch.flush();
  }

  /** Seeds a session's frames, then turns on what reports contexts, logs and errors. */
  private async start(id: SessionKey, transport: CdpTransport): Promise<void> {
    const { frameTree } = await transport.send<{ frameTree: PageFrameTree }>(CDP.Page.getFrameTree);
    if (!this.recording || this.sessions.get(id)?.transport !== transport) return;
    this.frames.seed(id, frameTree);
    await transport.send(CDP.Runtime.enable);
    await transport.send(CDP.Log.enable);
  }

  private push({ entry, values }: RowDraft): ConsoleEntry {
    const row = this.log.add(entry, values);
    this.batch.rowAdded(row);
    return row;
  }
}
