import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleService } from '../../src/main/console';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { MAX_CONSOLE_ENTRIES } from '../../src/shared/constants';
import { DEFAULT_SETTINGS, type AppEvent, type ConsoleEntry, type Settings } from '../../src/shared/types';

type Handler = (params: any, sessionId?: string) => void;

/** A flattened CDP transport: one per test, sessions told apart by id (undefined = the page). */
class FakeCdp implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown>; sessionId?: string }> = [];
  handlers = new Map<string, Set<Handler>>();
  /** Replies by `${session}|${method}`, or by method. */
  replies = new Map<string, unknown>();
  failing = new Set<string>();

  async send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T> {
    this.calls.push({ method, params, sessionId });
    const key = `${sessionId ?? 'page'}|${method}`;
    if (this.failing.has(key)) throw new Error(`${method} failed`);
    return (this.replies.get(key) ?? this.replies.get(method) ?? {}) as T;
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown, sessionId?: string): void {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(params, sessionId);
  }

  /** A view bound to one session, as PageInterception hands them out. */
  session(sessionId?: string): CdpTransport {
    return {
      send: (method, params) => this.send(method, params, sessionId),
      on: (event, handler) => this.on(event, (params, sid) => sid === sessionId && handler(params)),
    };
  }

  of(sessionId: string | undefined): string[] {
    return this.calls.filter((c) => c.sessionId === sessionId).map((c) => c.method);
  }
}

const tree = (id: string, url: string, children: Array<{ id: string; url: string; name?: string }> = [], parentId?: string) => ({
  frameTree: { frame: { id, url, ...(parentId ? { parentId } : {}) }, childFrames: children.map((c) => ({ frame: { ...c, parentId: id } })) },
});
const context = (id: number, frameId: string, isDefault = true) => ({ context: { id, origin: '', name: '', uniqueId: `u-${frameId}-${id}`, auxData: { frameId, isDefault } } });
const str = (value: string) => ({ type: 'string', value });
const num = (value: number) => ({ type: 'number', value, description: String(value) });
const obj = (objectId: string, description = 'Object', properties: Array<{ name: string; type: string; value?: string }> = []) => ({
  type: 'object',
  objectId,
  description,
  preview: { type: 'object', description, overflow: false, properties },
});
const call = (url: string, line = 0) => ({ functionName: 'f', url, lineNumber: line, columnNumber: 4 });

let cdp: FakeCdp;
let events: AppEvent[];
let settings: Settings;
let service: ConsoleService;

/** The page's session with the top frame (and a same-site iframe), and a cross-site iframe's session. */
async function withFrames() {
  cdp.replies.set('page|Page.getFrameTree', tree('TOP', 'https://shop.test/', [{ id: 'SAME', url: 'https://shop.test/nav', name: 'nav' }]));
  cdp.replies.set('S1|Page.getFrameTree', tree('CART', 'https://cart.test/embed', [], 'TOP'));
  await service.attached(undefined, cdp.session());
  cdp.emit('Runtime.executionContextCreated', context(1, 'TOP'));
  cdp.emit('Runtime.executionContextCreated', context(2, 'SAME'));
  await service.attached('S1', cdp.session('S1'));
  cdp.emit('Runtime.executionContextCreated', context(1, 'CART'), 'S1');
}

const sent = <T extends AppEvent['type']>(type: T) => events.filter((e): e is Extract<AppEvent, { type: T }> => e.type === type);
const rows = () => sent('console-entries').flatMap((e) => e.entries);

beforeEach(() => {
  cdp = new FakeCdp();
  events = [];
  settings = { ...DEFAULT_SETTINGS };
  service = new ConsoleService({ getSettings: () => settings, send: (e) => events.push(e) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('console service: frames', () => {
  it('turns the console on for each session as it is handed over: frames first, then contexts and logs', async () => {
    await withFrames();
    expect(cdp.of(undefined)).toEqual(['Page.getFrameTree', 'Runtime.enable', 'Log.enable']);
    expect(cdp.of('S1')).toEqual(['Page.getFrameTree', 'Runtime.enable', 'Log.enable']);
  });

  it('lists every frame across sessions, with its parent, and whether code can run in it', async () => {
    await withFrames();
    cdp.emit('Page.frameAttached', { frameId: 'ADS', parentFrameId: 'TOP' });
    expect(service.listFrames()).toEqual([
      { id: 'TOP', url: 'https://shop.test/', name: '', canRun: true },
      { id: 'SAME', parentId: 'TOP', url: 'https://shop.test/nav', name: 'nav', canRun: true },
      { id: 'CART', parentId: 'TOP', url: 'https://cart.test/embed', name: '', canRun: true },
      { id: 'ADS', parentId: 'TOP', url: '', name: '', canRun: false },
    ]);
  });

  it('keeps a frame that moved to another process, and drops a removed one with the frames in it', async () => {
    await withFrames();
    cdp.emit('Page.frameAttached', { frameId: 'INNER', parentFrameId: 'SAME' });
    cdp.emit('Page.frameDetached', { frameId: 'CART', reason: 'swap' });
    expect(service.listFrames().map((f) => f.id)).toContain('CART');
    cdp.emit('Page.frameDetached', { frameId: 'SAME', reason: 'remove' });
    expect(service.listFrames().map((f) => f.id)).toEqual(['TOP', 'CART']);
  });

  it("drops the frames a session hosted when it goes away, but not its parent's", async () => {
    await withFrames();
    service.detached('S1');
    expect(service.listFrames().map((f) => f.id)).toEqual(['TOP', 'SAME']);
  });

  it('follows navigations and contexts: a frame between documents cannot run code', async () => {
    await withFrames();
    cdp.emit('Page.frameNavigated', { frame: { id: 'CART', parentId: 'TOP', url: 'https://cart.test/checkout', name: 'cart' } }, 'S1');
    cdp.emit('Runtime.executionContextDestroyed', { executionContextId: 1 }, 'S1');
    expect(service.listFrames().find((f) => f.id === 'CART')).toEqual({ id: 'CART', parentId: 'TOP', url: 'https://cart.test/checkout', name: 'cart', canRun: false });
    cdp.emit('Runtime.executionContextCreated', context(5, 'CART'), 'S1');
    expect(service.listFrames().find((f) => f.id === 'CART')?.canRun).toBe(true);
    cdp.emit('Runtime.executionContextsCleared', {});
    expect(service.listFrames().filter((f) => f.canRun).map((f) => f.id)).toEqual(['CART']);
  });

  it('sends frame changes before the rows that may come from them, in one batch', async () => {
    vi.useFakeTimers();
    await withFrames();
    cdp.emit('Runtime.consoleAPICalled', { type: 'log', args: [str('hi')], executionContextId: 1, timestamp: 1 }, 'S1');
    expect(events).toEqual([]);
    await vi.advanceTimersByTimeAsync(60);
    expect(events.map((e) => e.type)).toEqual(['frames-changed', 'console-entries']);
  });
});

describe('console service: rows', () => {
  it("tags a console call with the frame of the context it ran in, the level of its method, and where it was called", async () => {
    await withFrames();
    cdp.emit(
      'Runtime.consoleAPICalled',
      { type: 'warning', args: [str('low stock'), num(2)], executionContextId: 2, timestamp: 1000, stackTrace: { callFrames: [call('https://shop.test/nav.js', 9)] } },
    );
    service.flush();
    expect(rows()).toEqual([
      {
        id: 1,
        frameId: 'SAME',
        level: 'warning',
        source: 'console',
        time: 1000,
        values: [
          { kind: 'string', text: 'low stock' },
          { kind: 'number', text: '2' },
        ],
        location: { url: 'https://shop.test/nav.js', line: 10, column: 5, functionName: 'f' },
        stack: [{ url: 'https://shop.test/nav.js', line: 10, column: 5, functionName: 'f' }],
      },
    ]);
  });

  it('fills in format directives, drops %c styles, and keeps the arguments left over', async () => {
    await withFrames();
    cdp.emit('Runtime.consoleAPICalled', {
      type: 'log',
      args: [str('%c%s has %d items (100%%)'), str('color: red'), str('cart'), num(3.7), obj('o1', 'Object', [{ name: 'sku', type: 'number', value: '42' }])],
      executionContextId: 1,
      timestamp: 1,
    }, 'S1');
    service.flush();
    expect(rows()[0]!.values).toEqual([
      { kind: 'string', text: 'cart has 3 items (100%)' },
      { kind: 'object', text: '{sku: 42}', handle: 1 },
    ]);
    expect(rows()[0]!.frameId).toBe('CART');
  });

  it("leaves out what Electron's own scripts log in the page (its warnings in builds run from source)", async () => {
    await withFrames();
    const stackTrace = { callFrames: [call('node:electron/js2c/sandbox_bundle', 1)] };
    cdp.emit('Runtime.consoleAPICalled', { type: 'warning', args: [str('Electron Security Warning')], executionContextId: 1, timestamp: 1, stackTrace });
    expect(service.listEntries()).toEqual([]);
  });

  it('previews arrays, maps and class instances as DevTools does', async () => {
    await withFrames();
    const arrayArg = { type: 'object', subtype: 'array', objectId: 'a', description: 'Array(3)', preview: { type: 'object', subtype: 'array', description: 'Array(3)', overflow: true, properties: [{ name: '0', type: 'string', value: 'x' }, { name: '1', type: 'number', value: '2' }] } };
    const mapArg = { type: 'object', subtype: 'map', objectId: 'm', description: 'Map(1)', preview: { type: 'object', subtype: 'map', description: 'Map(1)', overflow: false, properties: [], entries: [{ key: { type: 'string', description: 'a', overflow: false, properties: [] }, value: { type: 'number', description: '1', overflow: false, properties: [] } }] } };
    const orderArg = obj('c', 'Order', [{ name: 'id', type: 'number', value: '7' }]);
    cdp.emit('Runtime.consoleAPICalled', { type: 'log', args: [arrayArg, mapArg, orderArg, { type: 'object', subtype: 'null', value: null }, { type: 'undefined' }], executionContextId: 1, timestamp: 1 });
    service.flush();
    expect(rows()[0]!.values.map((v) => v.text)).toEqual(['["x", 2, …]', 'Map(1) {a => 1}', 'Order {id: 7}', 'null', 'undefined']);
  });

  it('shows an uncaught error once, with its own stack, and a thrown non-error with the stack of the throw', async () => {
    await withFrames();
    const error = { type: 'object', subtype: 'error', objectId: 'e', className: 'Error', description: 'Error: boom\n    at pay (https://cart.test/pay.js:3:9)' };
    const stackTrace = { callFrames: [call('https://cart.test/pay.js', 2)] };
    cdp.emit('Runtime.exceptionThrown', { timestamp: 5, exceptionDetails: { text: 'Uncaught', lineNumber: 2, columnNumber: 8, url: 'https://cart.test/pay.js', stackTrace, exception: error, executionContextId: 1 } }, 'S1');
    cdp.emit('Runtime.exceptionThrown', { timestamp: 6, exceptionDetails: { text: 'Uncaught', lineNumber: 0, columnNumber: 0, stackTrace, exception: str('nope'), executionContextId: 1 } }, 'S1');
    service.flush();
    const [thrown, other] = rows();
    expect(thrown).toMatchObject({ frameId: 'CART', level: 'error', source: 'exception', location: { url: 'https://cart.test/pay.js', line: 3, column: 9 } });
    expect(thrown!.values.map((v) => v.text)).toEqual(['Uncaught', 'Error: boom\n    at pay (https://cart.test/pay.js:3:9)']);
    expect(thrown!.stack).toBeUndefined();
    expect(other!.stack).toEqual([{ url: 'https://cart.test/pay.js', line: 3, column: 5, functionName: 'f' }]);
  });

  it("puts the browser's own messages on the frame its session was made for", async () => {
    await withFrames();
    cdp.emit('Log.entryAdded', { entry: { source: 'network', level: 'error', text: 'Failed to load resource: 404', timestamp: 7, url: 'https://cart.test/missing.js' } }, 'S1');
    service.flush();
    expect(rows()[0]).toMatchObject({ frameId: 'CART', level: 'error', source: 'browser', values: [{ kind: 'string', text: 'Failed to load resource: 404' }] });
  });

  it('adds a divider when a frame loads a page, but not for about:blank', async () => {
    await withFrames();
    cdp.emit('Page.frameNavigated', { frame: { id: 'CART', parentId: 'TOP', url: 'about:blank' } }, 'S1');
    cdp.emit('Page.frameNavigated', { frame: { id: 'CART', parentId: 'TOP', url: 'https://cart.test/checkout' } }, 'S1');
    service.flush();
    expect(rows()).toMatchObject([{ frameId: 'CART', source: 'navigation', values: [{ text: 'https://cart.test/checkout' }] }]);
  });

  it('keeps the most recent rows only, and forgets the values of the ones that dropped off', async () => {
    await withFrames();
    const logged = (i: number) => ({ type: 'log', args: [obj(`o${i}`)], executionContextId: 1, timestamp: i });
    for (let i = 0; i < MAX_CONSOLE_ENTRIES + 2; i++) cdp.emit('Runtime.consoleAPICalled', logged(i), 'S1');
    const kept = service.listEntries();
    expect(kept).toHaveLength(MAX_CONSOLE_ENTRIES);
    expect(kept[0]!.id).toBe(3);
    await expect(service.properties(1)).rejects.toThrow(/no longer available/);
    cdp.replies.set('Runtime.getProperties', { result: [] });
    await expect(service.properties(kept[0]!.values[0]!.handle)).resolves.toEqual([]);
  });
});

describe('console service: running code', () => {
  it("runs code in the frame's own context, on the session that hosts it, and records input and result", async () => {
    await withFrames();
    cdp.replies.set('S1|Runtime.evaluate', { result: obj('r1', 'Object', [{ name: 'ok', type: 'boolean', value: 'true' }]) });
    const result = await service.evaluate('CART', 'await pay()');
    const evaluate = cdp.calls.find((c) => c.method === 'Runtime.evaluate');
    expect(evaluate).toMatchObject({ sessionId: 'S1', params: { expression: 'await pay()', uniqueContextId: 'u-CART-1', replMode: true, awaitPromise: true, includeCommandLineAPI: true } });
    service.flush();
    expect(rows().map((r) => [r.source, r.frameId, r.values[0]!.text])).toEqual([
      ['input', 'CART', 'await pay()'],
      ['result', 'CART', '{ok: true}'],
    ]);
    expect(result).toEqual(rows()[1]);
  });

  it('records what the code threw as an error result', async () => {
    await withFrames();
    const exception = { type: 'object', subtype: 'error', objectId: 'x', description: 'ReferenceError: pay is not defined' };
    cdp.replies.set('S1|Runtime.evaluate', { result: exception, exceptionDetails: { text: 'Uncaught', lineNumber: 0, columnNumber: 0, exception } });
    const result = await service.evaluate('CART', 'pay()');
    expect(result).toMatchObject({ level: 'error', source: 'result', values: [{ text: 'Uncaught' }, { kind: 'error', text: 'ReferenceError: pay is not defined' }] });
  });

  it('refuses a frame with no JavaScript, and records a frame that went away mid-run', async () => {
    await withFrames();
    cdp.emit('Page.frameAttached', { frameId: 'SANDBOX', parentFrameId: 'TOP' });
    await expect(service.evaluate('SANDBOX', '1')).rejects.toThrow(/no JavaScript/);
    await expect(service.evaluate('NOPE', '1')).rejects.toThrow(/no JavaScript/);
    cdp.failing.add('S1|Runtime.evaluate');
    await expect(service.evaluate('CART', '1')).resolves.toMatchObject({ level: 'error', source: 'result', values: [{ text: 'Runtime.evaluate failed' }] });
  });

  it("lists a value's properties on the session it came from, each expandable in turn", async () => {
    await withFrames();
    cdp.emit('Runtime.consoleAPICalled', { type: 'log', args: [obj('o1', 'Order')], executionContextId: 1, timestamp: 1 }, 'S1');
    cdp.replies.set('S1|Runtime.getProperties', {
      result: [{ name: 'id', value: num(7) }, { name: 'lines', value: obj('o2', 'Array(2)') }, { name: 'total' }],
      internalProperties: [{ name: '[[Prototype]]', value: obj('o3') }],
    });
    const props = await service.properties(1);
    expect(cdp.calls.at(-1)).toMatchObject({ method: 'Runtime.getProperties', sessionId: 'S1', params: { objectId: 'o1', ownProperties: true } });
    expect(props).toEqual([
      { name: 'id', value: { kind: 'number', text: '7' } },
      { name: 'lines', value: { kind: 'object', text: 'Array(2) {}', handle: 2 } },
      { name: 'total', value: { kind: 'function', text: '(getter)' } },
      { name: '[[Prototype]]', value: { kind: 'object', text: '{}', handle: 3 } },
    ]);
    cdp.failing.add('S1|Runtime.getProperties');
    await expect(service.properties(2)).rejects.toThrow(/no longer available/);
    await expect(service.properties('1')).rejects.toThrow(/no longer available/);
  });

  it('clears the rows, and the values they kept alive in every session', async () => {
    await withFrames();
    cdp.emit('Runtime.consoleAPICalled', { type: 'log', args: [obj('o1')], executionContextId: 1, timestamp: 1 }, 'S1');
    await service.clear();
    expect(service.listEntries()).toEqual([]);
    expect(sent('console-cleared')).toHaveLength(1);
    for (const session of [undefined, 'S1']) expect(cdp.of(session)).toEqual(expect.arrayContaining(['Runtime.discardConsoleEntries', 'Runtime.releaseObjectGroup']));
    await expect(service.properties(1)).rejects.toThrow(/no longer available/);
  });
});

describe('console service: the setting', () => {
  it('records nothing while off, and turns on for every live session when switched on', async () => {
    settings.captureConsole = false;
    service = new ConsoleService({ getSettings: () => settings, send: (e) => events.push(e) });
    await withFrames();
    expect(cdp.calls).toEqual([]);
    cdp.emit('Runtime.consoleAPICalled', { type: 'log', args: [str('x')], executionContextId: 1, timestamp: 1 }, 'S1');
    expect(service.listEntries()).toEqual([]);

    settings.captureConsole = true;
    await service.applySettings();
    expect(cdp.of('S1')).toEqual(['Page.getFrameTree', 'Runtime.enable', 'Log.enable']);
    expect(service.listFrames().map((f) => f.id)).toEqual(['TOP', 'SAME', 'CART']);

    settings.captureConsole = false;
    await service.applySettings();
    expect(cdp.of('S1').slice(-2)).toEqual(['Runtime.disable', 'Log.disable']);
    expect(service.listFrames()).toEqual([]);
  });

  it('forgets every session when interception stops', async () => {
    await withFrames();
    service.detached(undefined);
    expect(service.listFrames()).toEqual([]);
    cdp.emit('Runtime.consoleAPICalled', { type: 'log', args: [str('late')], executionContextId: 1, timestamp: 1 }, 'S1');
    expect(service.listEntries() as ConsoleEntry[]).toEqual([]);
  });
});
