import { MAX_CONSOLE_ENTRIES } from '../../shared/constants';
import {
  CONSOLE_LEVELS,
  type AppEvent,
  type ConsoleEntry,
  type ConsoleFrame,
  type ConsoleLevel,
  type ConsoleProperty,
  type ConsoleValue,
  type Settings,
} from '../../shared/types';
import { HTTP_SCHEME } from '../constants';
import type { CdpTransport } from '../engine/cdp';
import { CDP } from '../engine/constants';
import type { SessionObserver } from '../engine/PageInterception';
import { ConsoleFrames } from './ConsoleFrames';
import {
  ACCESSOR_VALUE,
  CONSOLE_API_LEVEL,
  CONSOLE_BATCH_MS,
  ELECTRON_SCRIPT_PREFIX,
  EVAL_OBJECT_GROUP,
  EXPANDABLE_KINDS,
  MAX_PROPERTIES,
  SKIPPED_API_TYPES,
  STACK_API_TYPES,
  type ConsoleApiType,
} from './constants';
import { formatArgs } from './formatArgs';
import { kindOf } from './kindOf';
import { stackOf } from './stackOf';
import { toLocation } from './toLocation';
import type {
  ConsoleApiCalled,
  ConsoleSession,
  EvaluateReply,
  ExceptionDetails,
  ExceptionThrown,
  ExecutionContext,
  GetPropertiesReply,
  LogEntryAdded,
  ObjectHandle,
  PageFrame,
  PageFrameTree,
  RemoteObject,
} from './types';
import { valueText } from './valueText';

/** A CDP session: undefined for the page's own. */
type SessionKey = string | undefined;

/** A row before it is numbered: its values are made once its id is known (expandable values point back at it). */
type NewEntry = Omit<ConsoleEntry, 'id' | 'time' | 'values'> & { time?: number };

export interface ConsoleServiceOptions {
  getSettings(): Settings;
  send(event: AppEvent): void;
}

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
  private readonly frames = new ConsoleFrames(() => this.framesChanged());
  private entries: ConsoleEntry[] = [];
  /** Rows not yet sent. */
  private pending: ConsoleEntry[] = [];
  private framesDirty = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private nextEntryId = 1;
  private nextHandle = 1;
  private readonly handles = new Map<number, ObjectHandle>();
  /** Row id -> the handles of its values, dropped with the row. */
  private readonly handlesOf = new Map<number, number[]>();
  private recording: boolean;

  constructor(private readonly opts: ConsoleServiceOptions) {
    this.recording = opts.getSettings().captureConsole;
  }

  async attached(id: SessionKey, transport: CdpTransport): Promise<void> {
    this.sessions.set(id, { transport, dispose: this.listen(id, transport) });
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
      for (const { transport } of this.sessions.values()) {
        transport.send(CDP.Runtime.disable).catch(() => undefined);
        transport.send(CDP.Log.disable).catch(() => undefined);
      }
      this.frames.clear();
      return;
    }
    await Promise.all([...this.sessions].map(([id, { transport }]) => this.start(id, transport).catch(() => undefined)));
  }

  listFrames(): ConsoleFrame[] {
    return this.recording ? this.frames.list() : [];
  }

  listEntries(): ConsoleEntry[] {
    return [...this.entries];
  }

  /** Runs `code` in a frame's main world, as DevTools' console does (top-level `await`, `$0`, `copy()`). */
  async evaluate(frameId: unknown, code: unknown): Promise<ConsoleEntry> {
    if (typeof frameId !== 'string' || typeof code !== 'string') throw new Error('A frame id and code are needed');
    const target = this.frames.target(frameId);
    const session = target && this.sessions.get(target.sessionId);
    if (!target || !session) throw new Error('That frame has no JavaScript running.');
    this.push({ frameId, level: 'info', source: 'input' }, () => [{ kind: 'string', text: code }]);
    try {
      const reply = await session.transport.send<EvaluateReply>(CDP.Runtime.evaluate, {
        expression: code,
        uniqueContextId: target.uniqueId,
        objectGroup: EVAL_OBJECT_GROUP,
        replMode: true,
        includeCommandLineAPI: true,
        awaitPromise: true,
        userGesture: true,
        generatePreview: true,
      });
      if (reply.exceptionDetails) return this.pushException(target.sessionId, frameId, 'result', reply.exceptionDetails);
      return this.push({ frameId, level: 'info', source: 'result' }, (entryId) => [this.value(target.sessionId, entryId, reply.result)]);
    } catch (err) {
      // The frame navigated or went away while it ran.
      return this.push({ frameId, level: 'error', source: 'result' }, () => [{ kind: 'string', text: (err as Error).message }]);
    }
  }

  /** One level of an expandable value's properties. */
  async properties(handle: unknown): Promise<ConsoleProperty[]> {
    const target = typeof handle === 'number' ? this.handles.get(handle) : undefined;
    const session = target && this.sessions.get(target.sessionId);
    const gone = new Error('That value is no longer available: its frame has moved on.');
    if (!target || !session) throw gone;
    const reply = await session.transport
      .send<GetPropertiesReply>(CDP.Runtime.getProperties, { objectId: target.objectId, ownProperties: true, generatePreview: true })
      .catch(() => undefined);
    if (!reply || reply.exceptionDetails) throw gone;
    return [...reply.result, ...(reply.internalProperties ?? [])].slice(0, MAX_PROPERTIES).map((p) => ({
      name: p.name,
      value: p.value ? this.value(target.sessionId, target.entryId, p.value) : ACCESSOR_VALUE,
    }));
  }

  /** Drops every row, and the page-side values they kept alive. */
  async clear(): Promise<void> {
    this.entries = [];
    this.pending = [];
    this.handles.clear();
    this.handlesOf.clear();
    this.opts.send({ type: 'console-cleared' });
    await Promise.all(
      [...this.sessions.values()].map(async ({ transport }) => {
        await transport.send(CDP.Runtime.discardConsoleEntries).catch(() => undefined);
        await transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: EVAL_OBJECT_GROUP }).catch(() => undefined);
      }),
    );
  }

  /** Sends what is waiting now, instead of at the end of the batch. */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    // Frames first: new rows may come from a frame the renderer doesn't know yet.
    if (this.framesDirty) {
      this.framesDirty = false;
      this.opts.send({ type: 'frames-changed', frames: this.listFrames() });
    }
    if (this.pending.length) {
      const entries = this.pending;
      this.pending = [];
      this.opts.send({ type: 'console-entries', entries });
    }
  }

  /** Seeds a session's frames, then turns on what reports contexts, logs and errors. */
  private async start(id: SessionKey, transport: CdpTransport): Promise<void> {
    const { frameTree } = await transport.send<{ frameTree: PageFrameTree }>(CDP.Page.getFrameTree);
    if (!this.recording || this.sessions.get(id)?.transport !== transport) return;
    this.frames.seed(id, frameTree);
    await transport.send(CDP.Runtime.enable);
    await transport.send(CDP.Log.enable);
  }

  /** Follows a session's frames, contexts and messages; returns the unsubscribers. */
  private listen(id: SessionKey, transport: CdpTransport): Array<() => void> {
    const on = <T>(event: string, handler: (params: T) => void) =>
      transport.on(event, (params: T) => {
        if (this.recording) handler(params);
      });
    return [
      on<{ frame: PageFrame }>(CDP.Page.frameNavigated, ({ frame }) => this.onNavigated(id, frame)),
      on<{ frameId: string; parentFrameId?: string }>(CDP.Page.frameAttached, (p) => this.frames.attached(id, p.frameId, p.parentFrameId)),
      on<{ frameId: string; reason?: string }>(CDP.Page.frameDetached, (p) => this.frames.detached(p.frameId, p.reason)),
      on<{ context: ExecutionContext }>(CDP.Runtime.executionContextCreated, (p) => this.frames.contextCreated(id, p.context)),
      on<{ executionContextId: number }>(CDP.Runtime.executionContextDestroyed, (p) => this.frames.contextDestroyed(id, p.executionContextId)),
      on(CDP.Runtime.executionContextsCleared, () => this.frames.contextsCleared(id)),
      on<ConsoleApiCalled>(CDP.Runtime.consoleAPICalled, (p) => this.onConsoleApi(id, p)),
      on<ExceptionThrown>(CDP.Runtime.exceptionThrown, (p) =>
        this.pushException(id, this.frames.frameOf(id, p.exceptionDetails.executionContextId), 'exception', p.exceptionDetails, p.timestamp),
      ),
      on<LogEntryAdded>(CDP.Log.entryAdded, (p) => this.onLog(id, p)),
    ];
  }

  private onNavigated(id: SessionKey, frame: PageFrame): void {
    this.frames.navigated(id, frame);
    // A divider in the stream; about:blank and error pages aren't worth one.
    if (HTTP_SCHEME.test(frame.url)) this.push({ frameId: frame.id, level: 'info', source: 'navigation' }, () => [{ kind: 'string', text: frame.url }]);
  }

  private onConsoleApi(id: SessionKey, p: ConsoleApiCalled): void {
    const top = p.stackTrace?.callFrames[0];
    if (SKIPPED_API_TYPES.has(p.type) || top?.url.startsWith(ELECTRON_SCRIPT_PREFIX)) return;
    // A method newer than this build logs as info.
    const level: ConsoleLevel = Object.hasOwn(CONSOLE_API_LEVEL, p.type) ? CONSOLE_API_LEVEL[p.type as ConsoleApiType] : 'info';
    const stack = STACK_API_TYPES.has(p.type) ? stackOf(p.stackTrace) : undefined;
    this.push(
      {
        frameId: this.frames.frameOf(id, p.executionContextId),
        level,
        source: 'console',
        time: p.timestamp,
        ...(top ? { location: toLocation(top) } : {}),
        ...(stack ? { stack } : {}),
      },
      (entryId) => (p.args.length ? formatArgs(p.args, (arg) => this.value(id, entryId, arg)) : [{ kind: 'string', text: `console.${p.type}()` }]),
    );
  }

  private onLog(id: SessionKey, { entry }: LogEntryAdded): void {
    const level = CONSOLE_LEVELS.find((l) => l === entry.level) ?? 'info';
    const stack = stackOf(entry.stackTrace);
    this.push(
      {
        // The browser's messages don't say which context they are about: the session's own frame is the best guess.
        frameId: this.frames.frameOf(id),
        level,
        source: 'browser',
        time: entry.timestamp,
        ...(entry.url ? { location: { url: entry.url, line: (entry.lineNumber ?? 0) + 1, column: 1, functionName: '' } } : {}),
        ...(stack ? { stack } : {}),
      },
      () => [{ kind: 'string', text: entry.text }],
    );
  }

  /** An uncaught error or rejection, or code you ran that threw. */
  private pushException(id: SessionKey, frameId: string | null, source: 'exception' | 'result', details: ExceptionDetails, time?: number): ConsoleEntry {
    const top = details.stackTrace?.callFrames[0];
    const location = details.url
      ? { url: details.url, line: details.lineNumber + 1, column: details.columnNumber + 1, functionName: '' }
      : top && toLocation(top);
    // An Error's own text already ends with its stack.
    const stack = details.exception && kindOf(details.exception) === 'error' ? undefined : stackOf(details.stackTrace);
    return this.push(
      { frameId, level: 'error', source, ...(time === undefined ? {} : { time }), ...(location ? { location } : {}), ...(stack ? { stack } : {}) },
      (entryId) => [{ kind: 'string', text: details.text }, ...(details.exception ? [this.value(id, entryId, details.exception)] : [])],
    );
  }

  private push(entry: NewEntry, values: (entryId: number) => ConsoleValue[]): ConsoleEntry {
    const id = this.nextEntryId++;
    const row: ConsoleEntry = { ...entry, id, time: entry.time ?? Date.now(), values: values(id) };
    this.entries.push(row);
    this.pending.push(row);
    const over = this.entries.length - MAX_CONSOLE_ENTRIES;
    if (over > 0) for (const old of this.entries.splice(0, over)) this.dropHandles(old.id);
    if (this.pending.length > MAX_CONSOLE_ENTRIES) this.pending.splice(0, this.pending.length - MAX_CONSOLE_ENTRIES);
    this.schedule();
    return row;
  }

  /** A remote value as the renderer gets it; an object gets a handle for listing its properties later. */
  private value(sessionId: SessionKey, entryId: number, obj: RemoteObject): ConsoleValue {
    const kind = kindOf(obj);
    const value: ConsoleValue = { kind, text: valueText(obj) };
    if (!obj.objectId || !EXPANDABLE_KINDS.has(kind)) return value;
    const handle = this.nextHandle++;
    this.handles.set(handle, { sessionId, objectId: obj.objectId, entryId });
    const own = this.handlesOf.get(entryId);
    if (own) own.push(handle);
    else this.handlesOf.set(entryId, [handle]);
    return { ...value, handle };
  }

  private dropHandles(entryId: number): void {
    for (const handle of this.handlesOf.get(entryId) ?? []) this.handles.delete(handle);
    this.handlesOf.delete(entryId);
  }

  private framesChanged(): void {
    this.framesDirty = true;
    this.schedule();
  }

  private schedule(): void {
    this.timer ??= setTimeout(() => this.flush(), CONSOLE_BATCH_MS);
  }
}
