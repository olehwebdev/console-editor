import { describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { sha256 } from '../../src/main/engine/InterceptionEngine';
import { AUTO_ATTACH, SETUP_TIMEOUT_MS, SHARED_WORKER_HOLD_MS, UNREGISTER_TIMEOUT_MS, PageInterception, type SessionObserver } from '../../src/main/engine/PageInterception';
import { DEFAULT_SETTINGS, type BlockRule, type EngineEvent, type Override, type Rule } from '../../src/shared/types';

type Handler = (params: any, sessionId?: string) => void;

/** A CDP transport with flattened sessions: calls and events carry a sessionId (undefined = page). */
class FakeSessions implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown>; sessionId?: string }> = [];
  handlers = new Map<string, Set<Handler>>();
  failing = new Set<string>();
  responses: Record<string, unknown> = {
    'Page.getFrameTree': { frameTree: { frame: { id: 'frame' } } },
    'Page.addScriptToEvaluateOnNewDocument': { identifier: 'guard' },
    // Discovery reports shared workers of every browser context: the page's tells them apart.
    'Target.getTargetInfo': { targetInfo: { targetId: 'page', type: 'page', url: '', browserContextId: 'ctx' } },
    // What a service worker's own self.registration.unregister() answers when it worked.
    'Runtime.evaluate': { result: { type: 'boolean', value: true } },
  };
  /** Makes `method` on `sessionId` wait until released. */
  gates = new Map<string, () => void>();

  async send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T> {
    this.calls.push({ method, params, sessionId });
    const key = `${sessionId ?? 'page'}|${method}`;
    if (this.gates.has(key)) await new Promise<void>((resolve) => this.gates.set(key, resolve));
    if (this.failing.has(key)) throw new Error(`${method} failed`);
    if (method === 'Network.getResponseBody') return { body: `body from ${sessionId ?? 'page'}`, base64Encoded: false } as T;
    return (this.responses[method] ?? {}) as T;
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown, sessionId?: string): void {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(params, sessionId);
  }

  of(sessionId: string | undefined): string[] {
    return this.calls.filter((c) => c.sessionId === sessionId).map((c) => c.method);
  }

  gate(sessionId: string, method: string): void {
    this.gates.set(`${sessionId}|${method}`, () => undefined);
  }

  release(sessionId: string, method: string): void {
    this.gates.get(`${sessionId}|${method}`)?.();
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const iframe = (sessionId: string, targetId = `T-${sessionId}`, type = 'iframe') => ({
  sessionId,
  targetInfo: { targetId, type, url: '' },
  waitingForDebugger: true,
});
const worker = (sessionId: string, type = 'worker', url = `https://a.test/${sessionId}.js`) => ({
  sessionId,
  targetInfo: { targetId: `T-${sessionId}`, type, url },
  waitingForDebugger: true,
});
/** What discovery reports for a shared worker (attached as `worker(id, 'shared_worker')`). */
const sharedTarget = (id: string, browserContextId = 'ctx') => ({ targetId: `T-${id}`, type: 'shared_worker', url: `https://a.test/${id}.js`, browserContextId });
const paused = (cdp: FakeSessions, networkId: string, url: string, resourceType: string, sessionId?: string) =>
  cdp.emit(
    'Fetch.requestPaused',
    { requestId: `job-${networkId}`, networkId, resourceType, request: { url, method: 'GET' }, responseStatusCode: 200, responseHeaders: [] },
    sessionId,
  );
const response = (cdp: FakeSessions, requestId: string, url: string, sessionId: string, type = 'Script') =>
  cdp.emit('Network.responseReceived', { requestId, type, response: { url, status: 200, mimeType: 'text/javascript' } }, sessionId);
const fulfilled = (cdp: FakeSessions) => cdp.calls.filter((c) => c.method === 'Fetch.fulfillRequest').map((c) => c.params?.requestId);

const override: Override = {
  id: 'o1',
  kind: 'Script',
  sourceUrl: 'https://widget.test/w.js',
  match: { type: 'exact', pattern: 'https://widget.test/w.js', ignoreQuery: true },
  enabled: true,
  originalHash: null,
  createdAt: 0,
  updatedAt: 0,
  content: 'patched();',
};
const scriptOverride = (id: string, url: string): Override => ({ ...override, id, sourceUrl: url, match: { type: 'exact', pattern: url, ignoreQuery: true } });

interface SetupOptions {
  fallbackFetch?: (url: string) => Promise<string>;
  /** Runs on the fake connection before interception attaches. */
  before?: (cdp: FakeSessions) => void;
  sessions?: SessionObserver;
  /** The rules every engine reads (the same array: push to add one). */
  rules?: Rule[];
}

const blockWidget: BlockRule = {
  id: 'b1',
  action: 'block',
  match: { type: 'glob', pattern: 'https://widget.test/*', ignoreQuery: true },
  resourceTypes: [],
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
};

async function setup(overrides: Override[] = [], { fallbackFetch, before, sessions, rules = [] }: SetupOptions = {}) {
  const cdp = new FakeSessions();
  before?.(cdp);
  const events: EngineEvent[] = [];
  const pi = new PageInterception({
    transport: cdp,
    getOverrides: () => overrides,
    getRules: () => rules,
    getSettings: () => DEFAULT_SETTINGS,
    emit: (e) => events.push(e),
    fallbackFetch,
    sessions,
  });
  await pi.attach();
  return { cdp, pi, events };
}

describe('PageInterception', () => {
  it("enables the page's ServiceWorker domain (registration scopes), and attaches without it", async () => {
    const { cdp } = await setup();
    expect(cdp.of(undefined)).toContain('ServiceWorker.enable');
    await expect(setup([], { before: (c) => c.failing.add('page|ServiceWorker.enable') })).resolves.toBeDefined();
  });

  it('auto-attaches iframes and every kind of worker Chromium pauses, pausing them on start', async () => {
    const { cdp } = await setup();
    // A type Chromium pauses but the filter leaves out is never attached, so it never runs.
    expect(AUTO_ATTACH.filter).toEqual([{ type: 'iframe' }, { type: 'worker' }, { type: 'worklet' }, { type: 'service_worker' }, { exclude: true }]);
    expect(cdp.calls.find((c) => c.method === 'Target.setAutoAttach')).toEqual({
      method: 'Target.setAutoAttach',
      params: { ...AUTO_ATTACH },
      sessionId: undefined,
    });
  });

  it('sets up an engine on a new iframe, enables nested auto-attach, then resumes it', async () => {
    const { cdp, pi } = await setup();
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    const child = cdp.of('S1');
    expect(child.slice(0, 3)).toEqual(['Page.enable', 'Page.getFrameTree', 'Network.enable']);
    expect(child.at(-2)).toBe('Target.setAutoAttach');
    expect(child.at(-1)).toBe('Runtime.runIfWaitingForDebugger');
    expect(pi.targets()).toEqual([{ targetId: 'T-S1', sessionId: 'S1', type: 'iframe', depth: 1 }]);
  });

  it('always resumes the iframe, even when setting it up fails, and reports it', async () => {
    const { cdp, pi, events } = await setup();
    cdp.failing.add('S1|Network.enable');
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    expect(cdp.of('S1').at(-1)).toBe('Runtime.runIfWaitingForDebugger');
    // Kept: a partial setup still intercepts what it can, and later fan-outs retry.
    expect(pi.targets()).toHaveLength(1);
    expect(events).toContainEqual({ type: 'error', message: expect.stringMatching(/Overrides may not apply inside iframe T-S1/) });
  });

  it('resumes an iframe whose setup never answers (timeout)', async () => {
    vi.useFakeTimers();
    try {
      const { cdp, events } = await setup();
      cdp.gate('S1', 'Network.enable');
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      await vi.advanceTimersByTimeAsync(SETUP_TIMEOUT_MS + 10);
      expect(cdp.of('S1').at(-1)).toBe('Runtime.runIfWaitingForDebugger');
      expect(events).toContainEqual({ type: 'error', message: expect.stringMatching(/timed out/) });
    } finally {
      vi.useRealTimers();
    }
  });

  it('settles commands that were in flight when the iframe went away', async () => {
    const { cdp, pi, events } = await setup();
    cdp.gate('S1', 'Network.enable');
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    cdp.emit('Target.detachedFromTarget', { sessionId: 'S1' });
    await flush();
    // The never-answered Network.enable was abandoned: setup ended and the frame was resumed, no error shown.
    expect(cdp.of('S1').at(-1)).toBe('Runtime.runIfWaitingForDebugger');
    expect(pi.targets()).toEqual([]);
    expect(events.some((e) => e.type === 'error')).toBe(false);
  });

  it('resumes but ignores targets of other types, and duplicates', async () => {
    const { cdp, pi } = await setup();
    cdp.emit('Target.attachedToTarget', iframe('X1', 'T-X1', 'other'));
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    expect(cdp.of('X1')).toEqual(['Runtime.runIfWaitingForDebugger']);
    expect(cdp.of('S1').filter((m) => m === 'Page.enable')).toHaveLength(1);
    expect(pi.targets()).toHaveLength(1);
  });

  it('handles a paused request on the session it came from, never on the page', async () => {
    const { cdp, events } = await setup([override]);
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    const before = cdp.of(undefined).length;
    cdp.emit(
      'Fetch.requestPaused',
      { requestId: 'r1', networkId: 'n1', resourceType: 'Script', request: { url: 'https://widget.test/w.js', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] },
      'S1',
    );
    await flush();
    expect(cdp.calls.find((c) => c.method === 'Fetch.fulfillRequest')?.sessionId).toBe('S1');
    expect(cdp.of(undefined)).toHaveLength(before);
    cdp.emit('Network.responseReceived', { requestId: 'n1', type: 'Script', frameId: 'frame', response: { url: 'https://widget.test/w.js', status: 200, mimeType: 'text/javascript' } }, 'S1');
    const resource = events.findLast((e) => e.type === 'resource');
    expect(resource).toMatchObject({ resource: { url: 'https://widget.test/w.js', iframeId: 'S1', overrideId: 'o1', frame: { url: '', depth: 1 } } });
  });

  it("reads a cross-site iframe's document through the iframe's session, with the parent's upstream hash", async () => {
    const { cdp, pi } = await setup([override]);
    const raw = '<script src="w.js" integrity="sha384-x"></script>';
    cdp.responses['Fetch.getResponseBody'] = { body: raw, base64Encoded: false };
    // The page's session pauses the iframe's document (and strips its SRI attributes)…
    cdp.emit('Fetch.requestPaused', { requestId: 'f1', networkId: 'doc', resourceType: 'Document', request: { url: 'https://widget.test/', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
    await flush();
    cdp.emit('Network.responseReceived', { requestId: 'doc', type: 'Document', frameId: 'T-S1', response: { url: 'https://widget.test/', status: 200, mimeType: 'text/html' } });
    // …but only the iframe's own session (target id = frame id) can return the body.
    cdp.emit('Target.attachedToTarget', iframe('S1', 'T-S1'));
    await flush();
    const content = await pi.getResourceContent('https://widget.test/');
    expect(content.content).toBe('body from S1');
    expect(content.hash).toBe(sha256(raw));
  });

  it('drops a target and everything nested in it when it detaches', async () => {
    const { cdp, pi, events } = await setup();
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    cdp.emit('Target.attachedToTarget', iframe('S2'), 'S1');
    await flush();
    expect(pi.targets()).toEqual([
      { targetId: 'T-S1', sessionId: 'S1', type: 'iframe', depth: 1 },
      { targetId: 'T-S2', sessionId: 'S2', type: 'iframe', parentTargetId: 'T-S1', depth: 2 },
    ]);
    cdp.emit('Target.detachedFromTarget', { sessionId: 'S1' });
    expect(pi.targets()).toEqual([]);
    expect(events.filter((e) => e.type === 'iframe-detached')).toEqual([
      { type: 'iframe-detached', iframeId: 'S2' },
      { type: 'iframe-detached', iframeId: 'S1' },
    ]);
  });

  it('ignores an attach whose parent session is unknown (already gone), but resumes it', async () => {
    const { cdp, pi } = await setup();
    cdp.emit('Target.attachedToTarget', iframe('S9'), 'GONE');
    await flush();
    expect(cdp.of('S9')).toEqual(['Runtime.runIfWaitingForDebugger']);
    expect(pi.targets()).toEqual([]);
  });

  it('a target detached mid-setup is not re-added and gets no nested auto-attach', async () => {
    const { cdp, pi } = await setup();
    cdp.gate('S1', 'Network.enable');
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    cdp.emit('Target.detachedFromTarget', { sessionId: 'S1' });
    cdp.release('S1', 'Network.enable');
    await flush();
    await flush();
    expect(pi.targets()).toEqual([]);
    expect(cdp.of('S1')).not.toContain('Target.setAutoAttach');
  });

  it('fans settings and pattern changes out to every live iframe; a failing iframe does not fail the call', async () => {
    const { cdp, pi } = await setup([override]);
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    cdp.emit('Target.attachedToTarget', iframe('S2'));
    await flush();
    cdp.failing.add('S2|Fetch.enable');
    cdp.calls = [];
    await expect(pi.refreshInterception()).resolves.toBeUndefined();
    expect(cdp.calls.filter((c) => c.method === 'Fetch.enable').map((c) => c.sessionId)).toEqual([undefined, 'S1', 'S2']);
    await pi.applySettings();
    expect(cdp.calls.filter((c) => c.method === 'Network.setCacheDisabled').map((c) => c.sessionId)).toEqual([undefined, 'S1', 'S2']);
  });

  it('reads a resource through the session that loaded it', async () => {
    const { cdp, pi } = await setup();
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    cdp.emit('Network.responseReceived', { requestId: 'n1', type: 'Script', frameId: 'frame', response: { url: 'https://widget.test/w.js', status: 200, mimeType: 'text/javascript' } }, 'S1');
    const content = await pi.getResourceContent('https://widget.test/w.js');
    expect(content.content).toBe('body from S1');
    expect(pi.listResources().map((r) => r.iframeId)).toEqual(['S1']);
  });

  it('detach() turns auto-attach off and stops handling iframe events', async () => {
    const { cdp, pi } = await setup([override]);
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    pi.detach();
    expect(cdp.calls.at(-1)).toMatchObject({ method: 'Target.setAutoAttach', params: { autoAttach: false } });
    cdp.calls = [];
    cdp.emit('Fetch.requestPaused', { requestId: 'r', resourceType: 'Script', request: { url: 'https://widget.test/w.js', method: 'GET' }, responseStatusCode: 200 }, 'S1');
    cdp.emit('Target.attachedToTarget', iframe('S3'));
    await flush();
    expect(cdp.calls.map((c) => c.method)).toEqual([]);
  });

  describe('session observer (the console)', () => {
    /** Records what it is told, and sends a command on each session it gets, as the console does. */
    const observer = (log: string[], work: (id: string | undefined) => Promise<void> = async () => undefined): SessionObserver => ({
      async attached(id, transport) {
        log.push(`attached ${id ?? 'page'}`);
        await transport.send('Runtime.enable');
        await work(id);
      },
      detached: (id) => log.push(`detached ${id ?? 'page'}`),
    });

    it('gets the page once attached, and each iframe before it is resumed', async () => {
      const log: string[] = [];
      const { cdp } = await setup([], { sessions: observer(log) });
      expect(cdp.of(undefined).indexOf('Runtime.enable')).toBeLessThan(cdp.of(undefined).indexOf('Target.setAutoAttach'));
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      await flush();
      const child = cdp.of('S1');
      expect(child.indexOf('Runtime.enable')).toBeGreaterThan(-1);
      expect(child.indexOf('Runtime.enable')).toBeLessThan(child.indexOf('Runtime.runIfWaitingForDebugger'));
      expect(log).toEqual(['attached page', 'attached S1']);
    });

    it('never holds interception up: a failing observer changes nothing, a stuck one only until the setup timeout', async () => {
      const failing = await setup([], { sessions: observer([], async () => Promise.reject(new Error('console broke'))) });
      failing.cdp.emit('Target.attachedToTarget', iframe('S1'));
      await flush();
      expect(failing.cdp.of('S1').at(-1)).toBe('Runtime.runIfWaitingForDebugger');
      expect(failing.events).toEqual([]);

      vi.useFakeTimers();
      try {
        const stuck = await setup([], { sessions: observer([], (id) => (id ? new Promise(() => undefined) : Promise.resolve())) });
        stuck.cdp.emit('Target.attachedToTarget', iframe('S1'));
        await vi.advanceTimersByTimeAsync(SETUP_TIMEOUT_MS / 2);
        expect(stuck.cdp.of('S1')).not.toContain('Runtime.runIfWaitingForDebugger');
        await vi.advanceTimersByTimeAsync(SETUP_TIMEOUT_MS);
        expect(stuck.cdp.of('S1').at(-1)).toBe('Runtime.runIfWaitingForDebugger');
        expect(stuck.events).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('hears of sessions going away, nested ones first, and of interception stopping', async () => {
      const log: string[] = [];
      const { cdp, pi } = await setup([], { sessions: observer(log) });
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      await flush();
      cdp.emit('Target.attachedToTarget', iframe('S2'), 'S1');
      await flush();
      cdp.emit('Target.detachedFromTarget', { sessionId: 'S1' });
      pi.detach();
      expect(log.filter((l) => l.startsWith('detached'))).toEqual(['detached S2', 'detached S1', 'detached page']);
    });
  });

  describe('workers', () => {
    it('sends the auto-attach filter to page, iframe and dedicated worker sessions, which are the ones that start workers', async () => {
      const { cdp } = await setup();
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      cdp.emit('Target.attachedToTarget', worker('W1'));
      cdp.emit('Target.attachedToTarget', worker('WL', 'worklet'));
      cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
      cdp.emit('Target.attachedToTarget', worker('SH', 'shared_worker'));
      await flush();
      const autoAttach = cdp.calls.filter((c) => c.method === 'Target.setAutoAttach');
      expect(autoAttach.map((c) => c.sessionId ?? 'page').sort()).toEqual(['S1', 'W1', 'page']);
      for (const call of autoAttach) expect(call.params).toEqual({ ...AUTO_ATTACH });
    });

    it('sets a worker up and resumes it in the same task: Fetch first, Network before the resume', async () => {
      const { cdp, pi } = await setup();
      cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
      cdp.emit('Target.attachedToTarget', worker('SH', 'shared_worker'));
      cdp.emit('Target.attachedToTarget', worker('W1'));
      cdp.emit('Target.attachedToTarget', worker('WL', 'worklet'));
      // Nothing awaited yet: an installed service worker starting on a new session fetches right away.
      expect(cdp.of('SW')).toEqual(['Fetch.enable', 'Network.enable', 'Network.setCacheDisabled', 'Inspector.enable', 'Runtime.runIfWaitingForDebugger']);
      expect(cdp.of('SH')).toEqual([
        'Fetch.enable',
        'Network.enable',
        'Network.setCacheDisabled',
        'Network.setBypassServiceWorker',
        'Inspector.enable',
        'Runtime.runIfWaitingForDebugger',
      ]);
      // Its nested workers attach through its session, before it runs.
      expect(cdp.of('W1')).toEqual(['Network.enable', 'Network.setCacheDisabled', 'Network.setBypassServiceWorker', 'Target.setAutoAttach', 'Runtime.runIfWaitingForDebugger']);
      expect(cdp.of('WL')).toEqual(['Network.enable', 'Runtime.runIfWaitingForDebugger']);
      await flush();
      expect(pi.targets()).toEqual([
        { targetId: 'T-SW', sessionId: 'SW', type: 'service_worker', depth: 0 },
        { targetId: 'T-SH', sessionId: 'SH', type: 'shared_worker', depth: 0 },
        { targetId: 'T-W1', sessionId: 'W1', type: 'worker', depth: 0 },
        { targetId: 'T-WL', sessionId: 'WL', type: 'worklet', depth: 0 },
      ]);
    });

    it('resumes a worker without waiting for Network replies (a waiting service worker sends them only once it runs)', async () => {
      vi.useFakeTimers();
      try {
        const { cdp, events } = await setup();
        cdp.gate('SW', 'Network.enable');
        cdp.gate('W1', 'Network.enable');
        cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
        cdp.emit('Target.attachedToTarget', worker('W1'));
        expect(cdp.of('SW')).toContain('Runtime.runIfWaitingForDebugger');
        expect(cdp.of('W1')).toContain('Runtime.runIfWaitingForDebugger');
        await vi.advanceTimersByTimeAsync(2 * SETUP_TIMEOUT_MS + 10);
        // Only Fetch decides whether overrides apply there.
        expect(events.some((e) => e.type === 'error')).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('reports a worker as not intercepted only when its Fetch setup fails', async () => {
      const { cdp, pi, events } = await setup();
      cdp.failing.add('SW|Fetch.enable');
      cdp.failing.add('SH|Network.enable');
      cdp.failing.add('W1|Network.enable');
      cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
      cdp.emit('Target.attachedToTarget', worker('SH', 'shared_worker'));
      cdp.emit('Target.attachedToTarget', worker('W1'));
      await flush();
      expect(events.filter((e) => e.type === 'error')).toEqual([
        { type: 'error', message: 'Overrides may not apply inside service worker https://a.test/SW.js: Fetch.enable failed' },
      ]);
      expect(pi.targets()).toHaveLength(3);
    });

    it('reports a worker whose Fetch setup never answers (timeout), but not one that went away', async () => {
      vi.useFakeTimers();
      try {
        const { cdp, events } = await setup();
        cdp.gate('SW', 'Fetch.enable');
        cdp.gate('SH', 'Fetch.enable');
        cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
        cdp.emit('Target.attachedToTarget', worker('SH', 'shared_worker'));
        await vi.advanceTimersByTimeAsync(0);
        cdp.emit('Target.detachedFromTarget', { sessionId: 'SH' });
        await vi.advanceTimersByTimeAsync(SETUP_TIMEOUT_MS + 10);
        expect(events.filter((e) => e.type === 'error')).toEqual([
          { type: 'error', message: 'Overrides may not apply inside service worker https://a.test/SW.js: Setting up the service worker timed out after 5000 ms' },
        ]);
        // A gone worker isn't resumed again.
        await vi.advanceTimersByTimeAsync(SETUP_TIMEOUT_MS);
        expect(cdp.of('SH').filter((m) => m === 'Runtime.runIfWaitingForDebugger')).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('marks a worker started by another worker as nested: its first script is paused nowhere', async () => {
      const W2 = 'https://a.test/W2.js';
      const W3 = 'https://a.test/W3.js';
      const { cdp, pi, events } = await setup([scriptOverride('nested', W2), scriptOverride('framed', W3)]);
      cdp.emit('Target.attachedToTarget', worker('W1'));
      cdp.emit('Target.attachedToTarget', worker('W2'), 'W1');
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      await flush();
      cdp.emit('Target.attachedToTarget', worker('W3'), 'S1');
      await flush();
      expect(pi.targets()).toEqual([
        { targetId: 'T-W1', sessionId: 'W1', type: 'worker', depth: 0 },
        { targetId: 'T-W2', sessionId: 'W2', type: 'worker', parentTargetId: 'T-W1', depth: 0 },
        { targetId: 'T-S1', sessionId: 'S1', type: 'iframe', depth: 1 },
        { targetId: 'T-W3', sessionId: 'W3', type: 'worker', parentTargetId: 'T-S1', depth: 1 },
      ]);
      response(cdp, 'T-W2', W2, 'W2');
      response(cdp, 'T-W3', W3, 'W3');
      expect(events.filter((e) => e.type === 'override-missed')).toEqual([
        { type: 'override-missed', overrideId: 'nested', url: W2, reason: 'nested-worker' },
        { type: 'override-missed', overrideId: 'framed', url: W3 },
      ]);
    });

    it("credits the frame's session for a worker script it served that the worker's session reports", async () => {
      const W1 = 'https://a.test/W1.js';
      const { cdp, pi, events } = await setup([scriptOverride('w', W1)]);
      // The page pauses the worker's first script before the worker attaches.
      paused(cdp, 'T-W1', W1, 'Other');
      await flush();
      cdp.emit('Target.attachedToTarget', worker('W1'));
      response(cdp, 'T-W1', W1, 'W1');
      expect(pi.listResources()).toEqual([
        { url: W1, kind: 'Script', mimeType: 'text/javascript', status: 200, overrideId: 'w', worker: { type: 'worker', url: W1 }, workerId: 'W1' },
      ]);
      expect(events.some((e) => e.type === 'override-missed')).toBe(false);
    });

    it('fans pattern changes out to service and shared workers only, and settings without waiting on a stopped one', async () => {
      vi.useFakeTimers();
      try {
        const { cdp, pi } = await setup([override]);
        for (const [id, type] of [['W1', 'worker'], ['SW', 'service_worker'], ['SH', 'shared_worker'], ['WL', 'worklet']] as const) {
          cdp.emit('Target.attachedToTarget', worker(id, type));
        }
        await vi.advanceTimersByTimeAsync(0);
        cdp.calls = [];
        await pi.refreshInterception();
        // Dedicated workers and worklets are served on their frame's session.
        expect(cdp.calls.filter((c) => c.method === 'Fetch.enable').map((c) => c.sessionId)).toEqual([undefined, 'SW', 'SH']);
        // A stopped service worker answers Network commands only once it runs again.
        cdp.gate('SW', 'Network.setCacheDisabled');
        let applied = false;
        void pi.applySettings().then(() => (applied = true));
        await vi.advanceTimersByTimeAsync(0);
        expect(applied).toBe(true);
        expect(cdp.calls.filter((c) => c.method === 'Network.setCacheDisabled').map((c) => c.sessionId)).toEqual([undefined, 'W1', 'SW', 'SH']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('resumes a stopped service or shared worker that starts again on the same session', async () => {
      const { cdp } = await setup();
      cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
      cdp.emit('Target.attachedToTarget', worker('SH', 'shared_worker'));
      await flush();
      cdp.calls = [];
      cdp.emit('Inspector.targetReloadedAfterCrash', {}, 'SW');
      cdp.emit('Inspector.targetReloadedAfterCrash', {}, 'SH');
      expect(cdp.calls).toEqual([
        { method: 'Runtime.runIfWaitingForDebugger', params: {}, sessionId: 'SW' },
        { method: 'Runtime.runIfWaitingForDebugger', params: {}, sessionId: 'SH' },
      ]);
    });

    it('detaches from a shared worker that ended, so its next instance is found and attached before it starts', async () => {
      const { cdp, events } = await setup();
      cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
      cdp.emit('Target.attachedToTarget', worker('SH', 'shared_worker'));
      await flush();
      cdp.calls = [];
      // A stopped service worker keeps its session.
      cdp.emit('Inspector.targetCrashed', {}, 'SW');
      cdp.emit('Inspector.targetCrashed', {}, 'SH');
      expect(cdp.calls).toEqual([{ method: 'Target.detachFromTarget', params: { sessionId: 'SH' }, sessionId: undefined }]);
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SH' });
      expect(events).toContainEqual({ type: 'worker-detached', workerId: 'SH' });
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH2') });
      expect(cdp.calls.at(-1)).toEqual({ method: 'Target.attachToTarget', params: { targetId: 'T-SH2', flatten: true }, sessionId: undefined });
      // Its listeners went with it.
      cdp.calls = [];
      cdp.emit('Inspector.targetReloadedAfterCrash', {}, 'SH');
      expect(cdp.calls).toEqual([]);
    });

    it('reports workers that go away, with every session nested in them (Chromium reports no detach for those)', async () => {
      const { cdp, pi, events } = await setup();
      cdp.emit('Target.attachedToTarget', worker('W1'));
      cdp.emit('Target.attachedToTarget', worker('W2'), 'W1');
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      await flush();
      cdp.emit('Target.attachedToTarget', worker('W3'), 'S1');
      cdp.emit('Target.attachedToTarget', worker('W4'), 'W3');
      cdp.emit('Target.attachedToTarget', worker('WL', 'worklet'), 'S1');
      await flush();
      response(cdp, 'r1', 'https://a.test/lib.js', 'W4', 'Other');
      expect(pi.listResources().map((r) => r.workerId)).toEqual(['W4']);
      cdp.emit('Target.detachedFromTarget', { sessionId: 'W1' });
      cdp.emit('Target.detachedFromTarget', { sessionId: 'S1' });
      expect(events.filter((e) => e.type === 'worker-detached' || e.type === 'iframe-detached')).toEqual([
        { type: 'worker-detached', workerId: 'W2' },
        { type: 'worker-detached', workerId: 'W1' },
        { type: 'worker-detached', workerId: 'W4' },
        { type: 'worker-detached', workerId: 'W3' },
        { type: 'worker-detached', workerId: 'WL' },
        { type: 'iframe-detached', iframeId: 'S1' },
      ]);
      expect(pi.targets()).toEqual([]);
      expect(pi.listResources()).toEqual([]);
    });

    it("reads a worker's file through the worker's session", async () => {
      const { cdp, pi } = await setup();
      cdp.emit('Target.attachedToTarget', worker('W1'));
      await flush();
      response(cdp, 'r1', 'https://a.test/lib.js', 'W1', 'Other');
      expect((await pi.getResourceContent('https://a.test/lib.js')).content).toBe('body from W1');
    });

    it("falls back to fetching a worker's file out of the page when its session doesn't answer (a stopped service worker)", async () => {
      vi.useFakeTimers();
      try {
        const { cdp, pi } = await setup([], { fallbackFetch: async (url) => `fetched ${url}` });
        cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
        await vi.advanceTimersByTimeAsync(0);
        response(cdp, 'r1', 'https://a.test/swlib.js', 'SW', 'Other');
        cdp.gate('SW', 'Network.getResponseBody');
        const content = pi.getResourceContent('https://a.test/swlib.js');
        await vi.advanceTimersByTimeAsync(SETUP_TIMEOUT_MS + 10);
        expect((await content).content).toBe('fetched https://a.test/swlib.js');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('shared workers', () => {
    const SHARED = 'https://a.test/SH1.js';

    it('discovers the shared workers of its own browser context and attaches each once', async () => {
      const { cdp } = await setup();
      expect(cdp.of(undefined)).toContain('Target.getTargetInfo');
      expect(cdp.calls).toContainEqual({
        method: 'Target.setDiscoverTargets',
        params: { discover: true, filter: [{ type: 'shared_worker' }, { exclude: true }] },
        sessionId: undefined,
      });
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH1') });
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH1') });
      // Discovery is browser-wide in Electron.
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('X1', 'other') });
      cdp.emit('Target.targetCreated', { targetInfo: { ...sharedTarget('P1'), type: 'page' } });
      // Only the page's session discovers.
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('C1') }, 'S1');
      const attaches = () => cdp.calls.filter((c) => c.method === 'Target.attachToTarget');
      expect(attaches()).toEqual([{ method: 'Target.attachToTarget', params: { targetId: 'T-SH1', flatten: true }, sessionId: undefined }]);
      // In Electron the attach is dispatched inside that call; once set up, it isn't attached again.
      cdp.emit('Target.attachedToTarget', worker('SH1', 'shared_worker'));
      await flush();
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH1') });
      expect(attaches()).toHaveLength(1);
    });

    it("holds a frame's Other pauses (a shared worker's first script) until the worker's Fetch is on", async () => {
      const { cdp } = await setup([override, scriptOverride('shared', SHARED)]);
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH1') });
      paused(cdp, 'n1', SHARED, 'Other');
      // Only Other pauses wait.
      paused(cdp, 'n2', 'https://widget.test/w.js', 'Script');
      await flush();
      expect(fulfilled(cdp)).toEqual(['job-n2']);
      cdp.gate('SH1', 'Fetch.enable');
      cdp.emit('Target.attachedToTarget', worker('SH1', 'shared_worker'));
      await flush();
      expect(fulfilled(cdp)).toEqual(['job-n2']);
      cdp.release('SH1', 'Fetch.enable');
      await flush();
      expect(fulfilled(cdp)).toEqual(['job-n2', 'job-n1']);
    });

    it('stops holding when the attach fails', async () => {
      const { cdp } = await setup([scriptOverride('shared', SHARED)]);
      cdp.failing.add('page|Target.attachToTarget');
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH1') });
      paused(cdp, 'n1', SHARED, 'Other');
      await flush();
      expect(fulfilled(cdp)).toEqual(['job-n1']);
    });

    it('stops holding when the shared worker is destroyed before it attaches', async () => {
      const { cdp } = await setup([scriptOverride('shared', SHARED)]);
      cdp.gate('page', 'Target.attachToTarget');
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH1') });
      paused(cdp, 'n1', SHARED, 'Other');
      await flush();
      expect(fulfilled(cdp)).toEqual([]);
      cdp.emit('Target.targetDestroyed', { targetId: 'T-SH1' });
      await flush();
      expect(fulfilled(cdp)).toEqual(['job-n1']);
    });

    it('stops holding after a while, whatever happens', async () => {
      vi.useFakeTimers();
      try {
        const { cdp } = await setup([scriptOverride('shared', SHARED)]);
        cdp.gate('page', 'Target.attachToTarget');
        cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH1') });
        paused(cdp, 'n1', SHARED, 'Other');
        await vi.advanceTimersByTimeAsync(SHARED_WORKER_HOLD_MS - 10);
        expect(fulfilled(cdp)).toEqual([]);
        await vi.advanceTimersByTimeAsync(20);
        expect(fulfilled(cdp)).toEqual(['job-n1']);
        // Given up on: later scripts don't wait for it again.
        paused(cdp, 'n2', SHARED, 'Other');
        await vi.advanceTimersByTimeAsync(0);
        expect(fulfilled(cdp)).toEqual(['job-n1', 'job-n2']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('detach() lets go of shared workers, stops holding and turns discovery off', async () => {
      const { cdp, pi, events } = await setup([scriptOverride('shared', 'https://a.test/SH2.js')]);
      cdp.emit('Target.attachedToTarget', worker('SH1', 'shared_worker'));
      cdp.emit('Target.attachedToTarget', worker('SW', 'service_worker'));
      cdp.emit('Target.attachedToTarget', worker('W1'));
      await flush();
      cdp.gate('page', 'Target.attachToTarget');
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH2') });
      paused(cdp, 'n1', 'https://a.test/SH2.js', 'Other');
      await flush();
      cdp.calls = [];
      pi.detach();
      expect(cdp.of(undefined)).toEqual(['Target.detachFromTarget', 'Fetch.disable', 'Target.setDiscoverTargets', 'ServiceWorker.disable', 'Target.setAutoAttach']);
      expect(cdp.calls.find((c) => c.method === 'Target.detachFromTarget')?.params).toEqual({ sessionId: 'SH1' });
      expect(cdp.calls.find((c) => c.method === 'Target.setDiscoverTargets')?.params).toEqual({ discover: false });
      await flush();
      expect(fulfilled(cdp)).toEqual(['job-n1']);
      expect(pi.targets()).toEqual([]);
      expect(events.some((e) => e.type === 'worker-detached')).toBe(false);
      cdp.calls = [];
      cdp.emit('Target.targetCreated', { targetInfo: sharedTarget('SH3') });
      cdp.emit('Inspector.targetReloadedAfterCrash', {}, 'SW');
      await flush();
      expect(cdp.calls).toEqual([]);
    });
  });

  describe('a service worker whose session goes away', () => {
    const SW = 'https://a.test/SW1.js';
    const LIB = 'https://a.test/lib.js';
    /** SW1 installed through its session: its first script live, `LIB` served. */
    async function installed(cdp: FakeSessions) {
      cdp.emit('Target.attachedToTarget', worker('SW1', 'service_worker'));
      await flush();
      cdp.emit('Network.requestWillBeSent', { requestId: 'T-SW1', request: { url: SW } }, 'SW1');
      response(cdp, 'T-SW1', SW, 'SW1');
      paused(cdp, 'n1', LIB, 'Script', 'SW1');
      await flush();
      response(cdp, 'n1', LIB, 'SW1', 'Other');
    }
    /** The same service worker attached on a new session: it kept running. */
    const again = (sessionId: string, targetId = 'T-SW1') => ({ sessionId, targetInfo: { targetId, type: 'service_worker', url: SW }, waitingForDebugger: false });
    const evaluated = (cdp: FakeSessions) => cdp.calls.filter((c) => c.method === 'Runtime.evaluate').map((c) => c.sessionId);
    /** Target ids of the service workers whose state is kept (only memory shows it once it can't come back). */
    const kept = (pi: PageInterception) => [...(pi as unknown as { serviceWorkers: { kept: Map<string, unknown> } }).serviceWorkers.kept.keys()];

    it('is known again when the page comes back to its site: its files listed, not reinstalled while up to date', async () => {
      const lib = scriptOverride('lib', LIB);
      const { cdp, pi, events } = await setup([lib]);
      await installed(cdp);
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SW1' });
      expect(events.at(-1)).toEqual({ type: 'worker-detached', workerId: 'SW1' });
      cdp.emit('Target.attachedToTarget', again('SW2'));
      await flush();
      // Its installed scripts aren't fetched again.
      expect(pi.listResources()).toEqual([
        { url: SW, kind: 'Script', mimeType: 'text/javascript', status: 200, worker: { type: 'service_worker', url: SW }, workerId: 'SW2' },
        { url: LIB, kind: 'Script', mimeType: 'text/javascript', status: 200, overrideId: 'lib', worker: { type: 'service_worker', url: SW }, workerId: 'SW2' },
      ]);
      await pi.prepareReload();
      expect(evaluated(cdp)).toEqual([]);
      // And after its next session goes too; an override of what it runs changed since.
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SW2' });
      cdp.emit('Target.attachedToTarget', again('SW3'));
      await flush();
      expect(pi.listResources().map((r) => r.workerId)).toEqual(['SW3', 'SW3']);
      lib.updatedAt = 1;
      await pi.prepareReload();
      expect(evaluated(cdp)).toEqual(['SW3']);
    });

    /** What the page's ServiceWorker domain reports about SW1's registration. */
    const scoped = (cdp: FakeSessions, isDeleted = false) => {
      cdp.emit('ServiceWorker.workerRegistrationUpdated', { registrations: [{ registrationId: 'R1', scopeURL: 'https://a.test/', isDeleted }] });
      cdp.emit('ServiceWorker.workerVersionUpdated', {
        versions: [{ versionId: 'V1', registrationId: 'R1', scriptURL: SW, runningStatus: 'running', status: 'activated', targetId: 'T-SW1' }],
      });
    };
    const unregistered = (cdp: FakeSessions) => cdp.calls.filter((c) => c.method === 'ServiceWorker.unregister').map((c) => c.params);
    /** SW1 installed, then its session gone with the page (switching workspaces loads a blank page first). */
    async function left(overrides: Override[]) {
      const setUp = await setup(overrides);
      await installed(setUp.cdp);
      scoped(setUp.cdp);
      setUp.cdp.emit('Target.detachedFromTarget', { sessionId: 'SW1' });
      setUp.cdp.calls = [];
      return setUp;
    }

    it('is unregistered before its site loads again when what it runs is outdated by then (another workspace, other overrides)', async () => {
      const overrides = [scriptOverride('lib', LIB)];
      const { cdp, pi } = await left(overrides);
      // The other workspace's edit of the same file.
      overrides.splice(0, 1, scriptOverride('lib2', LIB));
      // Not for another site's page, nor with no page named.
      await pi.prepareReload('https://b.test/');
      await pi.prepareReload();
      expect(unregistered(cdp)).toEqual([]);
      await pi.prepareReload('https://a.test/page');
      expect(unregistered(cdp)).toEqual([{ scopeURL: 'https://a.test/' }]);
      expect(kept(pi)).toEqual([]);
      // Chromium attaching the unregistered version again: it's only resumed.
      cdp.calls = [];
      cdp.emit('Target.attachedToTarget', again('SW2'));
      await flush();
      expect(cdp.calls).toEqual([{ method: 'Runtime.runIfWaitingForDebugger', params: {}, sessionId: 'SW2' }]);
      expect(pi.targets()).toEqual([]);
    });

    it('is left installed when its site loads again and nothing it runs changed', async () => {
      const { cdp, pi } = await left([scriptOverride('lib', LIB)]);
      await pi.prepareReload('https://a.test/');
      expect(unregistered(cdp)).toEqual([]);
      expect(kept(pi)).toEqual(['T-SW1']);
    });

    it("is left to its next session when its scope isn't known, or unregistering fails; forgotten once its registration is deleted", async () => {
      const overrides = [scriptOverride('lib', LIB)];
      const { cdp, pi } = await setup(overrides);
      await installed(cdp);
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SW1' });
      overrides.length = 0;
      await pi.prepareReload('https://a.test/');
      expect(cdp.calls.filter((c) => c.method.startsWith('ServiceWorker.unregister'))).toEqual([]);
      expect(kept(pi)).toEqual(['T-SW1']);

      scoped(cdp);
      cdp.failing.add('page|ServiceWorker.unregister');
      await pi.prepareReload('https://a.test/');
      expect(unregistered(cdp)).toEqual([{ scopeURL: 'https://a.test/' }]);
      expect(kept(pi)).toEqual(['T-SW1']);

      scoped(cdp, true);
      cdp.calls = [];
      await pi.prepareReload('https://a.test/');
      expect(unregistered(cdp)).toEqual([]);
      expect(kept(pi)).toEqual([]);
    });

    it('is handled through its session while it has one again, not twice', async () => {
      const overrides = [scriptOverride('lib', LIB)];
      const { cdp, pi } = await left(overrides);
      cdp.emit('Target.attachedToTarget', again('SW2'));
      await flush();
      overrides.length = 0;
      cdp.calls = [];
      await pi.prepareReload('https://a.test/');
      expect(unregistered(cdp)).toEqual([{ scopeURL: 'https://a.test/' }]);
      expect(cdp.calls.filter((c) => c.method === 'Target.detachFromTarget').map((c) => c.params)).toEqual([{ sessionId: 'SW2' }]);
    });

    it('is known by its target id only (a new version is another worker)', async () => {
      const { cdp, pi } = await setup([scriptOverride('lib', LIB)]);
      await installed(cdp);
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SW1' });
      cdp.emit('Target.attachedToTarget', again('SW2', 'T-SW2'));
      await flush();
      expect(pi.listResources()).toEqual([]);
    });

    it('is let go of once unregistered, and left alone when Chromium attaches it again (it keeps such a version running)', async () => {
      const lib = scriptOverride('lib', LIB);
      const { cdp, pi } = await setup([lib]);
      await installed(cdp);
      lib.updatedAt = 1;
      await pi.prepareReload();
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SW1' });
      cdp.emit('Target.attachedToTarget', again('SW2'));
      await flush();
      expect(cdp.of('SW2')).toEqual(['Runtime.runIfWaitingForDebugger']);
      expect(pi.targets()).toEqual([]);
      expect(pi.listResources()).toEqual([]);
      expect(kept(pi)).toEqual([]);
    });

    it('is forgotten on detach()', async () => {
      const { cdp, pi } = await setup([scriptOverride('lib', LIB)]);
      await installed(cdp);
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SW1' });
      cdp.emit('Target.attachedToTarget', worker('SW2', 'service_worker'));
      await flush();
      pi.detach();
      // It's never used again: what it kept would only take memory.
      expect(kept(pi)).toEqual([]);
    });

    it('is kept for the 50 service workers that went away last', async () => {
      const { cdp, pi } = await setup();
      const sw = (i: number, sessionId = `S${i}`) => ({ sessionId, targetInfo: { targetId: `T${i}`, type: 'service_worker', url: `https://a.test/sw${i}.js` }, waitingForDebugger: false });
      /** Service worker `i` attached on `sessionId`, started, and gone. */
      const cycle = (i: number, sessionId = `S${i}`) => {
        cdp.emit('Target.attachedToTarget', sw(i, sessionId));
        cdp.emit('Inspector.workerScriptLoaded', {}, sessionId);
        cdp.emit('Target.detachedFromTarget', { sessionId });
      };
      for (let i = 0; i < 50; i++) cycle(i);
      // Back and gone again: now the last to go.
      cycle(0, 'R0');
      cycle(50);
      for (const i of [0, 1, 2]) cdp.emit('Target.attachedToTarget', sw(i, `A${i}`));
      await flush();
      expect(pi.listResources().map((r) => r.workerId)).toEqual(['A0', 'A2']);
    });
  });

  describe('prepareReload', () => {
    /** SW1, installed before its session attached, on a site with script overrides: outdated. */
    async function outdated() {
      const setUp = await setup([scriptOverride('lib', 'https://a.test/lib.js')]);
      setUp.cdp.emit('Target.attachedToTarget', worker('SW1', 'service_worker'));
      await flush();
      setUp.cdp.emit('Inspector.workerScriptLoaded', {}, 'SW1');
      return setUp;
    }
    /** What the page's ServiceWorker domain reports about SW1's registration (and a session's own, ignored). */
    const registration = (cdp: FakeSessions, isDeleted = false) => {
      cdp.emit('ServiceWorker.workerRegistrationUpdated', { registrations: [{ registrationId: 'R1', scopeURL: 'https://a.test/', isDeleted }] });
      cdp.emit('ServiceWorker.workerVersionUpdated', {
        versions: [{ versionId: 'V1', registrationId: 'R1', scriptURL: 'https://a.test/SW1.js', runningStatus: 'running', status: 'activated', targetId: 'T-SW1' }],
      });
      cdp.emit('ServiceWorker.workerRegistrationUpdated', { registrations: [{ registrationId: 'R1', scopeURL: 'https://a.test/elsewhere/', isDeleted: false }] }, 'SW1');
    };
    const unregisterByScope = { method: 'ServiceWorker.unregister', params: { scopeURL: 'https://a.test/' }, sessionId: undefined };
    const letGo = { method: 'Target.detachFromTarget', params: { sessionId: 'SW1' }, sessionId: undefined };

    it("unregisters an outdated service worker through the browser, by its registration's scope, then lets go of it", async () => {
      const { cdp, pi, events } = await outdated();
      registration(cdp);
      // Stopped: it can't answer, the browser can.
      cdp.gate('SW1', 'Runtime.evaluate');
      cdp.calls = [];
      await pi.prepareReload();
      // Chromium keeps an unregistered version running while a debugger is attached.
      expect(cdp.calls).toEqual([unregisterByScope, letGo]);
      await pi.prepareReload();
      expect(cdp.calls).toHaveLength(2);
      cdp.emit('Target.detachedFromTarget', { sessionId: 'SW1' });
      expect(events.at(-1)).toEqual({ type: 'worker-detached', workerId: 'SW1' });
    });

    it('lets a service worker whose registration was deleted go without unregistering (its scope may hold a newer one)', async () => {
      const { cdp, pi } = await outdated();
      registration(cdp);
      registration(cdp, true);
      cdp.calls = [];
      await pi.prepareReload();
      expect(cdp.calls).toEqual([letGo]);
    });

    it('keeps a service worker it failed to unregister, and tries again on the next reload', async () => {
      const { cdp, pi } = await outdated();
      registration(cdp);
      cdp.failing.add('page|ServiceWorker.unregister');
      cdp.calls = [];
      await pi.prepareReload();
      expect(cdp.calls).toEqual([unregisterByScope]);
      cdp.failing.clear();
      await pi.prepareReload();
      expect(cdp.calls).toEqual([unregisterByScope, unregisterByScope, letGo]);
    });

    it("keeps a service worker whose own unregister() failed (the evaluate answers with an exception), and tries again on the next reload", async () => {
      const { cdp, pi } = await outdated();
      cdp.responses['Runtime.evaluate'] = { result: { type: 'object', subtype: 'error', className: 'DOMException' }, exceptionDetails: { exceptionId: 1, text: 'Uncaught (in promise)' } };
      cdp.calls = [];
      await pi.prepareReload();
      expect(cdp.of(undefined)).toEqual([]);
      cdp.responses['Runtime.evaluate'] = { result: { type: 'boolean', value: true } };
      await pi.prepareReload();
      expect(cdp.of('SW1')).toEqual(['Runtime.evaluate', 'Runtime.evaluate']);
      expect(cdp.of(undefined)).toEqual(['Target.detachFromTarget']);
    });

    it('keeps a service worker whose own unregister() found nothing to unregister', async () => {
      const { cdp, pi } = await outdated();
      cdp.responses['Runtime.evaluate'] = { result: { type: 'boolean', value: false } };
      cdp.calls = [];
      await pi.prepareReload();
      expect(cdp.of(undefined)).toEqual([]);
    });

    it("unregisters from inside a service worker whose registration's scope isn't reported yet", async () => {
      const { cdp, pi } = await outdated();
      cdp.emit('ServiceWorker.workerVersionUpdated', {
        versions: [{ versionId: 'V1', registrationId: 'R1', scriptURL: 'https://a.test/SW1.js', runningStatus: 'running', status: 'activated', targetId: 'T-SW1' }],
      });
      cdp.calls = [];
      await pi.prepareReload();
      expect(cdp.of('SW1')).toEqual(['Runtime.evaluate']);
      expect(cdp.calls.filter((c) => !c.sessionId)).toEqual([letGo]);
    });

    it('asks only service workers running outdated code to unregister, once', async () => {
      const { cdp, pi } = await setup([scriptOverride('lib', 'https://a.test/lib.js'), scriptOverride('w', 'https://a.test/W1.js')]);
      cdp.emit('Target.attachedToTarget', worker('SW1', 'service_worker'));
      cdp.emit('Target.attachedToTarget', worker('SW2', 'service_worker', 'https://b.test/SW2.js'));
      cdp.emit('Target.attachedToTarget', worker('W1'));
      await flush();
      // Both started from scripts installed before their sessions attached; only SW1's site has script overrides.
      cdp.emit('Inspector.workerScriptLoaded', {}, 'SW1');
      cdp.emit('Inspector.workerScriptLoaded', {}, 'SW2');
      await pi.prepareReload();
      // Retired: the reload installs it afresh, through interception.
      await pi.prepareReload();
      expect(cdp.calls.filter((c) => c.method === 'Runtime.evaluate')).toEqual([
        {
          method: 'Runtime.evaluate',
          params: { expression: 'self.registration.unregister()', awaitPromise: true, returnByValue: true },
          sessionId: 'SW1',
        },
      ]);
      expect(cdp.calls.filter((c) => c.method === 'Target.detachFromTarget')).toEqual([letGo]);
    });

    it('does not wait long for a service worker that never answers, and tries again on the next reload', async () => {
      vi.useFakeTimers();
      try {
        const { cdp, pi } = await setup([scriptOverride('sw', 'https://a.test/SW1.js')]);
        cdp.emit('Target.attachedToTarget', worker('SW1', 'service_worker'));
        await vi.advanceTimersByTimeAsync(0);
        cdp.gate('SW1', 'Runtime.evaluate');
        let ready = false;
        void pi.prepareReload().then(() => (ready = true));
        await vi.advanceTimersByTimeAsync(UNREGISTER_TIMEOUT_MS - 10);
        expect(ready).toBe(false);
        await vi.advanceTimersByTimeAsync(20);
        expect(ready).toBe(true);
        expect(cdp.of(undefined)).not.toContain('Target.detachFromTarget');
        cdp.gates.delete('SW1|Runtime.evaluate');
        await pi.prepareReload();
        expect(cdp.calls.filter((c) => c.method === 'Runtime.evaluate')).toHaveLength(2);
        expect(cdp.calls.filter((c) => c.method === 'Target.detachFromTarget')).toEqual([letGo]);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('rules', () => {
    const requestPatterns = (c: { params?: Record<string, unknown> }) =>
      (c.params!.patterns as Array<{ requestStage: string }>).filter((p) => p.requestStage === 'Request');

    it("blocks a request paused on an iframe's session, on that session (every engine reads the rules)", async () => {
      const { cdp, events } = await setup([], { rules: [blockWidget] });
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      await flush();
      cdp.emit('Fetch.requestPaused', { requestId: 'r1', networkId: 'n1', resourceType: 'Script', frameId: 'frame', request: { url: 'https://widget.test/ads.js', method: 'GET' } }, 'S1');
      await flush();
      expect(cdp.calls.find((c) => c.method === 'Fetch.failRequest')).toEqual({
        method: 'Fetch.failRequest',
        params: { requestId: 'r1', errorReason: 'BlockedByClient' },
        sessionId: 'S1',
      });
      expect(events).toContainEqual({ type: 'rule-applied', ruleId: 'b1', url: 'https://widget.test/ads.js' });
      expect(events.findLast((e) => e.type === 'resource')).toMatchObject({ resource: { blockedBy: 'b1', iframeId: 'S1' } });
    });

    it('fans Request-stage patterns out to the page and every iframe', async () => {
      const rules: Rule[] = [];
      const { cdp, pi } = await setup([], { rules });
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      cdp.emit('Target.attachedToTarget', iframe('S2'));
      await flush();
      cdp.calls = [];
      rules.push(blockWidget);
      await pi.refreshInterception();
      const enables = cdp.calls.filter((c) => c.method === 'Fetch.enable');
      expect(enables.map((c) => c.sessionId)).toEqual([undefined, 'S1', 'S2']);
      for (const c of enables) expect(requestPatterns(c)).toEqual([{ urlPattern: 'https://widget.test/**', requestStage: 'Request' }]);
    });

    it("sets a new iframe's rule patterns before it is let run", async () => {
      const { cdp } = await setup([], { rules: [blockWidget] });
      cdp.emit('Target.attachedToTarget', iframe('S1'));
      await flush();
      const child = cdp.calls.filter((c) => c.sessionId === 'S1');
      const enable = child.findIndex((c) => c.method === 'Fetch.enable');
      expect(enable).toBeGreaterThanOrEqual(0);
      expect(requestPatterns(child[enable])).toHaveLength(1);
      expect(enable).toBeLessThan(child.findIndex((c) => c.method === 'Runtime.runIfWaitingForDebugger'));
    });
  });
});
