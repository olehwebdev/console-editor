import { describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { IFRAME_AUTO_ATTACH, IFRAME_SETUP_TIMEOUT_MS, PageInterception } from '../../src/main/engine/PageInterception';
import { DEFAULT_SETTINGS, type EngineEvent, type Override } from '../../src/shared/types';

type Handler = (params: any, sessionId?: string) => void;

/** A CDP transport with flattened sessions: calls and events carry a sessionId (undefined = page). */
class FakeSessions implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown>; sessionId?: string }> = [];
  handlers = new Map<string, Set<Handler>>();
  failing = new Set<string>();
  responses: Record<string, unknown> = {
    'Page.getFrameTree': { frameTree: { frame: { id: 'frame' } } },
    'Page.addScriptToEvaluateOnNewDocument': { identifier: 'guard' },
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
  base: '',
};

async function setup(overrides: Override[] = []) {
  const cdp = new FakeSessions();
  const events: EngineEvent[] = [];
  const pi = new PageInterception({
    transport: cdp,
    getOverrides: () => overrides,
    getSettings: () => DEFAULT_SETTINGS,
    emit: (e) => events.push(e),
  });
  await pi.attach();
  return { cdp, pi, events };
}

describe('PageInterception', () => {
  it('auto-attaches to iframe targets only, pausing them on start', async () => {
    const { cdp } = await setup();
    expect(cdp.calls.find((c) => c.method === 'Target.setAutoAttach')).toEqual({
      method: 'Target.setAutoAttach',
      params: { ...IFRAME_AUTO_ATTACH },
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
    expect(pi.targets()).toEqual([{ targetId: 'T-S1', sessionId: 'S1', depth: 1 }]);
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
      await vi.advanceTimersByTimeAsync(IFRAME_SETUP_TIMEOUT_MS + 10);
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

  it('resumes but ignores non-iframe targets and duplicates', async () => {
    const { cdp, pi } = await setup();
    cdp.emit('Target.attachedToTarget', iframe('W1', 'T-W1', 'worker'));
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    expect(cdp.of('W1')).toEqual(['Runtime.runIfWaitingForDebugger']);
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

  it('drops a target and everything nested in it when it detaches', async () => {
    const { cdp, pi, events } = await setup();
    cdp.emit('Target.attachedToTarget', iframe('S1'));
    await flush();
    cdp.emit('Target.attachedToTarget', iframe('S2'), 'S1');
    await flush();
    expect(pi.targets()).toEqual([
      { targetId: 'T-S1', sessionId: 'S1', depth: 1 },
      { targetId: 'T-S2', sessionId: 'S2', parentTargetId: 'T-S1', depth: 2 },
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
});
