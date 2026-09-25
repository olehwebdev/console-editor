import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { DETECT_DELAY_MS } from '../../src/main/inspector/constants';
import { DETECT_SOURCE } from '../../src/main/inspector/detectSource';
import { HOOKS_SOURCE } from '../../src/main/inspector/hooksSource';
import { toStackHits } from '../../src/main/inspector/toStackHits';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type FrameStack, type Settings } from '../../src/shared/types';

type Handler = (params: any, sessionId?: string) => void;

/** A flattened CDP transport: sessions told apart by id (undefined = the page). */
class FakeCdp implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown>; sessionId?: string }> = [];
  handlers = new Map<string, Set<Handler>>();
  /** Replies by `${session}|${method}`, or by method; a function is called with the params. */
  replies = new Map<string, unknown>();
  failing = new Set<string>();

  async send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T> {
    this.calls.push({ method, params, sessionId });
    const key = `${sessionId ?? 'page'}|${method}`;
    if (this.failing.has(key)) throw new Error(`${method} failed`);
    const reply = this.replies.get(key) ?? this.replies.get(method) ?? {};
    return (typeof reply === 'function' ? reply(params) : reply) as T;
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown, sessionId?: string): void {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(params, sessionId);
  }

  session(sessionId?: string): CdpTransport {
    return {
      send: (method, params) => this.send(method, params, sessionId),
      on: (event, handler) => this.on(event, (params, sid) => sid === sessionId && handler(params)),
    };
  }

  /** The detector's runs: the context each ran in. */
  detections(): string[] {
    return this.calls.filter((c) => c.method === 'Runtime.evaluate' && c.params?.expression === DETECT_SOURCE).map((c) => c.params?.uniqueContextId as string);
  }
}

const tree = (id: string, url: string) => ({ frameTree: { frame: { id, url } } });
const context = (id: number, frameId: string) => ({ context: { id, origin: '', name: '', uniqueId: `u-${frameId}-${id}`, auxData: { frameId, isDefault: true } } });
const found = (value: unknown) => ({ result: { type: 'object', value } });
const REACT = { id: 'react', signal: 'hook', version: '19.3.0', build: 'production' };

describe('page stack (InspectorService)', () => {
  let cdp: FakeCdp;
  let settings: Settings;
  let events: AppEvent[];
  let services: FrameServices;

  /** What the last stack-changed said. */
  const lastStacks = (): FrameStack[] | undefined => events.filter((e) => e.type === 'stack-changed').at(-1)?.stacks;
  /** The page's session with its top frame recorded and its main world known. */
  const attachPage = async () => {
    cdp.replies.set('page|Page.getFrameTree', tree('top', 'https://site.test/'));
    await services.attached(undefined, cdp.session());
    cdp.emit('Runtime.executionContextCreated', context(1, 'top'));
  };
  const loaded = async (frameId: string, sessionId?: string) => {
    cdp.emit('Page.frameStoppedLoading', { frameId }, sessionId);
    await vi.advanceTimersByTimeAsync(DETECT_DELAY_MS);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    cdp = new FakeCdp();
    settings = { ...DEFAULT_SETTINGS };
    events = [];
    services = new FrameServices(() => settings, (e) => events.push(e));
    cdp.replies.set('page|Page.addScriptToEvaluateOnNewDocument', { identifier: 'hook-1' });
    cdp.replies.set('page|Runtime.evaluate', found([REACT]));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts the React hook stand-in in every session before its documents load, with Page on first', async () => {
    await attachPage();
    cdp.replies.set('child|Page.getFrameTree', tree('cart', 'https://cart.test/'));
    await services.attached('child', cdp.session('child'));
    for (const sessionId of [undefined, 'child']) {
      const calls = cdp.calls.filter((c) => c.sessionId === sessionId).map((c) => c.method);
      expect(calls.indexOf('Page.enable')).toBeLessThan(calls.indexOf('Page.addScriptToEvaluateOnNewDocument'));
      expect(cdp.calls.find((c) => c.sessionId === sessionId && c.method === 'Page.addScriptToEvaluateOnNewDocument')?.params).toEqual({ source: HOOKS_SOURCE });
    }
  });

  it('takes the stand-in out when the setting is turned off, and puts it back when turned on', async () => {
    await attachPage();
    settings.frameworkHooks = false;
    await services.applySettings();
    expect(cdp.calls.filter((c) => c.method === 'Page.removeScriptToEvaluateOnNewDocument').map((c) => c.params)).toEqual([{ identifier: 'hook-1' }]);
    settings.frameworkHooks = true;
    await services.applySettings();
    expect(cdp.calls.filter((c) => c.method === 'Page.addScriptToEvaluateOnNewDocument')).toHaveLength(2);
  });

  it('adds no stand-in to a session while the setting is off', async () => {
    settings.frameworkHooks = false;
    await attachPage();
    expect(cdp.calls.some((c) => c.method === 'Page.addScriptToEvaluateOnNewDocument')).toBe(false);
  });

  it('looks at a frame a moment after it loads, silently and by value in its main world, and sends what it found', async () => {
    // What V8 lists when the debugger is turned on: the frame's scripts, one naming a source map.
    const script = (scriptId: string, url: string, sourceMapURL: string, frameId = 'top', isDefault = true) => ({ scriptId, url, sourceMapURL, executionContextAuxData: { frameId, isDefault } });
    cdp.replies.set('Debugger.enable', () => {
      for (const parsed of [
        script('1', 'https://site.test/app.js', 'app.js.map'),
        script('2', 'https://cdn.test/analytics.js', ''),
        // Not the frame's own files: its document's inline script, an isolated world's copy, evaluated code, another frame's.
        script('3', 'https://site.test/', ''),
        script('4', 'https://cdn.test/extension.js', '', 'top', false),
        script('5', '', ''),
        script('6', 'https://widget.test/w.js', '', 'child'),
      ])
        cdp.emit('Debugger.scriptParsed', parsed);
      return {};
    });
    await attachPage();
    cdp.emit('Page.frameStoppedLoading', { frameId: 'top' });
    await vi.advanceTimersByTimeAsync(DETECT_DELAY_MS - 1);
    expect(cdp.detections()).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);

    expect(cdp.detections()).toEqual(['u-top-1']);
    expect(cdp.calls.find((c) => c.params?.expression === DETECT_SOURCE)?.params).toMatchObject({ returnByValue: true, silent: true });
    expect(lastStacks()).toEqual([
      { frameId: 'top', url: 'https://site.test/', hits: [REACT], scannedAt: expect.any(Number), coverage: { scripts: 2, mapped: 1, unmapped: ['https://cdn.test/analytics.js'] } },
    ]);
    expect(services.inspector.list()).toEqual(lastStacks());
    // Nothing of it reaches the console.
    expect(services.console.listEntries()).toEqual([]);
  });

  it('looks once when a frame reports loading twice in quick succession', async () => {
    await attachPage();
    cdp.emit('Page.frameStoppedLoading', { frameId: 'top' });
    cdp.emit('Page.frameStoppedLoading', { frameId: 'top' });
    await vi.advanceTimersByTimeAsync(DETECT_DELAY_MS);
    expect(cdp.detections()).toEqual(['u-top-1']);
  });

  it("drops a frame's stack when it navigates, and doesn't look at the document it left", async () => {
    await attachPage();
    await loaded('top');
    cdp.emit('Page.frameStoppedLoading', { frameId: 'top' });
    cdp.emit('Page.frameNavigated', { frame: { id: 'top', url: 'https://site.test/next' } });
    expect(lastStacks()).toEqual([]);
    await vi.advanceTimersByTimeAsync(DETECT_DELAY_MS);
    expect(cdp.detections()).toEqual(['u-top-1']);
  });

  it('drops an answer that comes back after the frame moved to another document', async () => {
    await attachPage();
    cdp.replies.set('page|Runtime.evaluate', () => {
      // The frame's main world changes while the detector runs.
      cdp.emit('Runtime.executionContextCreated', context(2, 'top'));
      return found([REACT]);
    });
    await loaded('top');
    expect(lastStacks()).toBeUndefined();
  });

  it('keeps no stack for a frame that threw or could not answer', async () => {
    await attachPage();
    cdp.replies.set('page|Runtime.evaluate', { result: { type: 'object' }, exceptionDetails: { text: 'Uncaught' } });
    await loaded('top');
    cdp.failing.add('page|Runtime.evaluate');
    await loaded('top');
    expect(lastStacks()).toBeUndefined();
  });

  it("looks in a cross-site iframe's own session, and drops its stack when that session goes", async () => {
    await attachPage();
    cdp.replies.set('child|Page.getFrameTree', tree('cart', 'https://cart.test/'));
    cdp.replies.set('child|Runtime.evaluate', found([{ id: 'vue', signal: 'app', version: '3.5.43', build: 'production' }]));
    await services.attached('child', cdp.session('child'));
    cdp.emit('Runtime.executionContextCreated', context(7, 'cart'), 'child');
    await loaded('top');
    await loaded('cart', 'child');
    expect(cdp.calls.filter((c) => c.params?.expression === DETECT_SOURCE).map((c) => [c.sessionId, c.params?.uniqueContextId])).toEqual([
      [undefined, 'u-top-1'],
      ['child', 'u-cart-7'],
    ]);
    expect(lastStacks()?.map((s) => [s.frameId, s.hits.map((h) => h.id)])).toEqual([
      ['top', ['react']],
      ['cart', ['vue']],
    ]);

    services.detached('child');
    expect(lastStacks()?.map((s) => s.frameId)).toEqual(['top']);
  });

  it('looks at nothing while the console does not record, and at every frame once it does', async () => {
    settings.captureConsole = false;
    services = new FrameServices(() => settings, (e) => events.push(e));
    cdp.replies.set('page|Page.getFrameTree', tree('top', 'https://site.test/'));
    await services.attached(undefined, cdp.session());
    await loaded('top');
    expect(cdp.detections()).toEqual([]);

    settings.captureConsole = true;
    cdp.replies.set('page|Runtime.enable', () => cdp.emit('Runtime.executionContextCreated', context(3, 'top')));
    await services.applySettings();
    expect(cdp.detections()).toEqual(['u-top-3']);
    expect(lastStacks()?.map((s) => s.frameId)).toEqual(['top']);
  });

  it('scans every frame at once when asked', async () => {
    await attachPage();
    await services.inspector.scan();
    expect(cdp.detections()).toEqual(['u-top-1']);
  });

  it('still records the console when putting the stand-in in fails', async () => {
    cdp.failing.add('page|Page.addScriptToEvaluateOnNewDocument');
    await attachPage();
    expect(services.console.listFrames().map((f) => f.id)).toEqual(['top']);
  });
});

describe('page stack findings (toStackHits)', () => {
  it('keeps what names a known library and signal, and drops the rest', () => {
    expect(
      toStackHits([
        REACT,
        { id: 'react', signal: 'fiber', version: null, build: 'development' },
        { id: 'toString', signal: 'hook' },
        { id: 'vue', signal: 'nope' },
        { id: 'angular', signal: 'attribute', version: '17.3.0', build: 'staging' },
        'react',
        null,
      ]),
    ).toEqual([REACT, { id: 'angular', signal: 'attribute', version: '17.3.0', build: null }]);
  });

  it("shows only what looks like a version, and nothing of a page's markup", () => {
    const version = (v: unknown) => toStackHits([{ id: 'jquery', signal: 'global', version: v }])[0].version;
    expect(version(' 3.7.1 ')).toBe('3.7.1');
    expect(version('5')).toBe('5');
    expect(version('19.3.0-canary.1+abc')).toBe('19.3.0-canary.1+abc');
    expect(version('<img src=x onerror=alert(1)>')).toBeNull();
    expect(version('x'.repeat(41))).toBeNull();
    expect(version(19)).toBeNull();
  });

  it('takes at most 40 findings, and nothing but a list', () => {
    expect(toStackHits({ length: 1, 0: REACT })).toEqual([]);
    expect(toStackHits([...Array(40).fill(null), REACT])).toEqual([]);
  });
});
