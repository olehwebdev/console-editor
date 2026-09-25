/**
 * Patch mode: a response override that applies what was changed (its content against the text it was
 * made from) to each live response, and answers with its saved text when upstream fails or the edits
 * don't fit.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { InterceptionEngine } from '../../src/main/engine/InterceptionEngine';
import { OverrideStore } from '../../src/main/store/OverrideStore';
import { validateResponseSettings } from '../../src/shared/overrides';
import { DEFAULT_SETTINGS, type EngineEvent, type Override } from '../../src/shared/types';

const API = 'https://api.a.com/user';
const BASE = '{"name":"Ada","plan":"free","items":[1,2]}';
const EDITED = '{"name":"A very, very long name","plan":"free","items":[]}';

function patching(partial: Partial<Override> = {}): Override {
  return {
    id: 'p1',
    kind: 'Fetch',
    sourceUrl: API,
    match: { type: 'exact', pattern: API, ignoreQuery: true },
    enabled: true,
    originalHash: null,
    request: { method: 'GET', operation: '' },
    response: { status: 200, delayMs: 0, headers: [], send: true, patch: true },
    createdAt: 0,
    updatedAt: 0,
    content: EDITED,
    ...partial,
  };
}

class FakeTransport implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  handlers = new Map<string, Set<(p: unknown) => void>>();
  responses: Record<string, unknown> = { 'Page.getFrameTree': { frameTree: { frame: { id: 'main' } } } };

  async send<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    this.calls.push({ method, params });
    return (this.responses[method] ?? {}) as T;
  }

  on(event: string, handler: (p: unknown) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown): void {
    for (const h of this.handlers.get(event) ?? []) h(params);
  }

  sent(method: string) {
    return this.calls.filter((c) => c.method === method);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

async function engineWith(overrides: Override[], base: (id: string) => Promise<string> = async () => BASE) {
  const transport = new FakeTransport();
  const events: EngineEvent[] = [];
  const bases: string[] = [];
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getRules: () => [],
    getSettings: () => ({ ...DEFAULT_SETTINGS }),
    getOverrideBase: (id) => {
      bases.push(id);
      return base(id);
    },
    emit: (e) => events.push(e),
  });
  await engine.attach();
  transport.calls = [];
  return { transport, events, bases };
}

/** The live response, as Chromium hands its body over. */
function live(t: FakeTransport, body: string, extra: Record<string, unknown> = {}) {
  t.responses['Fetch.getResponseBody'] = { body, base64Encoded: false };
  t.emit('Fetch.requestPaused', {
    requestId: 'job',
    networkId: 'net-1',
    resourceType: 'XHR',
    request: { url: API, method: 'GET', headers: {} },
    responseStatusCode: 200,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    ...extra,
  });
}

const served = (t: FakeTransport) => t.sent('Fetch.fulfillRequest').map((c) => Buffer.from((c.params as { body: string }).body, 'base64').toString('utf8'));

describe('patch mode', () => {
  it('applies what was changed to the live response, keeping what changed upstream', async () => {
    const { transport, events } = await engineWith([patching()]);
    live(transport, '{"name":"Grace","plan":"pro","items":[7,8,9],"id":9007199254740993}');
    await flush();
    expect(served(transport)).toEqual(['{"name":"A very, very long name","plan":"pro","items":[],"id":9007199254740993}']);
    expect(events).toContainEqual({ type: 'override-served', overrideId: 'p1', url: API, requestId: 'net-1' });
  });

  it('works out the edits once per version of the override', async () => {
    const o = patching();
    const { transport, bases } = await engineWith([o]);
    live(transport, BASE);
    await flush();
    live(transport, BASE);
    await flush();
    expect(bases).toEqual(['p1']);
  });

  it('serves the live text untouched when nothing was edited', async () => {
    const { transport } = await engineWith([patching({ content: BASE })]);
    live(transport, '{ "name": "Grace" ,"plan":"pro","items":[1,2] }');
    await flush();
    expect(served(transport)).toEqual(['{ "name": "Grace" ,"plan":"pro","items":[1,2] }']);
  });

  it('answers with the saved text when upstream failed, without reading it', async () => {
    const { transport, events } = await engineWith([patching()]);
    live(transport, '{"error":"boom"}', { responseStatusCode: 503 });
    await flush();
    expect(served(transport)).toEqual([EDITED]);
    expect(transport.sent('Fetch.getResponseBody')).toEqual([]);
    expect(events.some((e) => e.type === 'override-unpatched')).toBe(false);
  });

  it.each([
    ['the live response is not JSON', '<html>maintenance</html>', BASE, 'live'],
    ['the edited member is gone from it', '{"plan":"pro","items":{"a":1}}', BASE, 'shape'],
    ['the text it was made from is not JSON', BASE, 'not json', 'saved'],
  ])('answers with the saved text, and says so, when %s', async (_why, body, base, reason) => {
    const { transport, events } = await engineWith([patching()], async () => base);
    live(transport, body);
    await flush();
    expect(served(transport)).toEqual([EDITED]);
    expect(events).toContainEqual({ type: 'override-unpatched', overrideId: 'p1', url: API, reason });
  });

  it('never reads an event stream', async () => {
    const { transport } = await engineWith([patching()]);
    live(transport, '', { responseHeaders: [{ name: 'Content-Type', value: 'text/event-stream' }] });
    await flush();
    expect(transport.sent('Fetch.getResponseBody')).toEqual([]);
    expect(served(transport)).toEqual([EDITED]);
  });

  it('serves the saved text as it is with patch mode off', async () => {
    const { transport, bases } = await engineWith([patching({ response: { status: 200, delayMs: 0, headers: [], send: true, patch: false } })]);
    live(transport, BASE);
    await flush();
    expect(served(transport)).toEqual([EDITED]);
    expect(bases).toEqual([]);
  });
});

describe('the patch setting', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'console-editor-patch-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('is on or off, and needs the request sent', () => {
    expect(validateResponseSettings({ status: 200, delayMs: 0, headers: [], send: true, patch: true })).toBeNull();
    expect(validateResponseSettings({ status: 200, delayMs: 0, headers: [], send: false, patch: true })).toMatch(/has to be sent/);
    expect(validateResponseSettings({ status: 200, delayMs: 0, headers: [], send: true, patch: 1 as never })).toMatch(/Patch live/);
  });

  it('is kept, and the base patch mode diffs against is the text the override was made from', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const o = await store.create({ kind: 'Fetch', sourceUrl: API, content: EDITED, base: BASE, originalHash: null, response: { status: 200, delayMs: 0, headers: [], send: true, patch: true } });
    const again = new OverrideStore(dir);
    await again.load();
    expect(again.meta(o.id).response).toMatchObject({ patch: true });
    expect(await again.base(o.id)).toBe(BASE);
  });
});
