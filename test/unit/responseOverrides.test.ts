import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { answersKind, computeFetchPatterns, InterceptionEngine } from '../../src/main/engine/InterceptionEngine';
import { OverrideStore } from '../../src/main/store/OverrideStore';
import { graphqlOperation, validateRequestMatch, validateResponseSettings } from '../../src/shared/overrides';
import { DEFAULT_SETTINGS, type EngineEvent, type Override } from '../../src/shared/types';

const API = 'https://api.a.com/cart';

function response(partial: Partial<Override> = {}): Override {
  return {
    id: 'r1',
    kind: 'Fetch',
    sourceUrl: API,
    match: { type: 'exact', pattern: API, ignoreQuery: true },
    enabled: true,
    originalHash: null,
    request: { method: 'GET', operation: '' },
    response: { status: 200, delayMs: 0, headers: [], send: true, patch: false },
    createdAt: 0,
    updatedAt: 0,
    content: '{"items":[]}',
    ...partial,
  };
}

class FakeTransport implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  handlers = new Map<string, Set<(p: unknown) => void>>();
  failing = new Map<string, string>();
  responses: Record<string, unknown> = { 'Page.getFrameTree': { frameTree: { frame: { id: 'main' } } } };

  async send<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    this.calls.push({ method, params });
    const failure = this.failing.get(method);
    if (failure) throw new Error(failure);
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

async function engineWith(overrides: Override[]) {
  const transport = new FakeTransport();
  const events: EngineEvent[] = [];
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getRules: () => [],
    getSettings: () => ({ ...DEFAULT_SETTINGS }),
    emit: (e) => events.push(e),
  });
  await engine.attach();
  transport.calls = [];
  return { transport, events };
}

/** A fetch() of `url`, paused at the response stage (Chromium reports fetch() as XHR). */
function paused(t: FakeTransport, extra: Record<string, unknown> = {}, request: Record<string, unknown> = {}) {
  t.emit('Fetch.requestPaused', {
    requestId: 'job',
    networkId: 'net-1',
    resourceType: 'XHR',
    request: { url: API, method: 'GET', headers: {}, ...request },
    responseStatusCode: 200,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: 'https://a.com' },
      { name: 'Content-Length', value: '12' },
    ],
    ...extra,
  });
}

const fulfilled = (t: FakeTransport) => t.sent('Fetch.fulfillRequest').map((c) => c.params as { responseCode: number; responseHeaders: Array<{ name: string; value: string }>; body: string });
const bodyOf = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');

describe('graphqlOperation', () => {
  it('reads operationName, else the first named operation of the query', () => {
    expect(graphqlOperation(JSON.stringify({ operationName: 'GetCart', query: 'query Other { a }' }))).toBe('GetCart');
    expect(graphqlOperation(JSON.stringify({ query: 'fragment F on Cart { id } mutation ApplyCoupon($c: String) { a }' }))).toBe('ApplyCoupon');
    expect(graphqlOperation(JSON.stringify({ query: '{ anonymous }' }))).toBeUndefined();
  });

  it('names nothing for a batch, a body that is not JSON, or none', () => {
    expect(graphqlOperation(JSON.stringify([{ operationName: 'A' }]))).toBeUndefined();
    expect(graphqlOperation('a=1&b=2')).toBeUndefined();
    expect(graphqlOperation(undefined)).toBeUndefined();
  });
});

describe('validating a response override', () => {
  it('takes a method or *, and an operation name or none', () => {
    expect(validateRequestMatch({ method: 'GET', operation: '' })).toBeNull();
    expect(validateRequestMatch({ method: '*', operation: 'GetCart' })).toBeNull();
    expect(validateRequestMatch({ method: 'get', operation: '' })).toMatch(/method/);
    expect(validateRequestMatch({ method: 'GET', operation: '1bad' })).toMatch(/operation/);
  });

  it('takes a status of 100–599, a delay of up to a minute, and header changes a header rule could make', () => {
    const ok = { status: 503, delayMs: 2000, headers: [{ operation: 'set' as const, name: 'X-Mock', value: '1' }], send: true, patch: false };
    expect(validateResponseSettings(ok)).toBeNull();
    expect(validateResponseSettings({ ...ok, status: 99 })).toMatch(/status/);
    expect(validateResponseSettings({ ...ok, status: 200.5 })).toMatch(/status/);
    expect(validateResponseSettings({ ...ok, delayMs: 60_001 })).toMatch(/delay/);
    expect(validateResponseSettings({ ...ok, headers: [{ operation: 'set', name: 'Content-Length', value: '1' }] })).toMatch(/frames/);
    expect(validateResponseSettings({ ...ok, headers: [null as never] })).toMatch(/header change/);
  });
});

describe('answering fetch() and XHR', () => {
  it('lets a response override answer only fetch() and XHR, never a file', () => {
    expect(answersKind('Fetch', 'XHR')).toBe(true);
    expect(answersKind('Fetch', 'Fetch')).toBe(true);
    for (const type of ['Script', 'Document', 'Stylesheet', 'Image', 'Other']) expect(answersKind('Fetch', type)).toBe(false);
    expect(answersKind('Script', 'XHR')).toBe(true);
  });

  it('pauses a regex response override as XHR, and an exact one by its URL alone', () => {
    const regex = response({ match: { type: 'regex', pattern: '/api/', ignoreQuery: false } });
    expect(computeFetchPatterns([regex], [], DEFAULT_SETTINGS)).toEqual([{ urlPattern: '*', resourceType: 'XHR', requestStage: 'Response' }]);
    expect(computeFetchPatterns([response()], [], DEFAULT_SETTINGS)).toEqual([{ urlPattern: `${API}*`, requestStage: 'Response' }]);
  });

  it('serves its body with its status, and its header changes on top of the upstream headers', async () => {
    const o = response({
      content: '{"items":[{"name":"Edited"}]}',
      response: { status: 503, delayMs: 0, headers: [{ operation: 'set', name: 'X-Mock', value: 'cart-v2' }, { operation: 'remove', name: 'access-control-allow-origin', value: '' }], send: true, patch: false },
    });
    const { transport, events } = await engineWith([o]);
    paused(transport);
    await flush();
    const [sent] = fulfilled(transport);
    expect(sent.responseCode).toBe(503);
    expect(bodyOf(sent.body)).toBe('{"items":[{"name":"Edited"}]}');
    const names = sent.responseHeaders.map((h) => h.name.toLowerCase());
    expect(names).toContain('x-mock');
    expect(names).not.toContain('access-control-allow-origin');
    expect(names).not.toContain('content-length');
    expect(sent.responseHeaders.find((h) => h.name.toLowerCase() === 'content-type')?.value).toBe('application/json; charset=utf-8');
    expect(events).toContainEqual({ type: 'override-served', overrideId: 'r1', url: API, requestId: 'net-1' });
  });

  it('keeps the upstream CORS headers it was not told to change', async () => {
    const { transport } = await engineWith([response()]);
    paused(transport);
    await flush();
    expect(fulfilled(transport)[0].responseHeaders).toContainEqual({ name: 'Access-Control-Allow-Origin', value: 'https://a.com' });
  });

  it('answers only the method it names, or any with *', async () => {
    const post = await engineWith([response({ request: { method: 'POST', operation: '' } })]);
    paused(post.transport);
    await flush();
    expect(fulfilled(post.transport)).toHaveLength(0);
    expect(post.transport.sent('Fetch.continueRequest')).toHaveLength(1);

    const any = await engineWith([response({ request: { method: '*', operation: '' } })]);
    paused(any.transport, {}, { method: 'DELETE' });
    await flush();
    expect(fulfilled(any.transport)).toHaveLength(1);
  });

  it('never answers a CORS preflight, whatever its method', async () => {
    const { transport } = await engineWith([response({ request: { method: '*', operation: '' } })]);
    paused(transport, {}, { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'PUT' } });
    await flush();
    expect(fulfilled(transport)).toHaveLength(0);
  });

  it('matches the GraphQL operation a body names; the override naming it beats a catch-all', async () => {
    const graphql = 'https://a.com/graphql';
    const match = { type: 'exact' as const, pattern: graphql, ignoreQuery: true };
    const getCart = response({ id: 'cart', match, request: { method: 'POST', operation: 'GetCart' }, content: '"cart"', updatedAt: 1 });
    const anyPost = response({ id: 'any', match, request: { method: 'POST', operation: '' }, content: '"any"', updatedAt: 2 });
    const { transport } = await engineWith([getCart, anyPost]);
    const body = (operationName: string) => ({ url: graphql, method: 'POST', postData: JSON.stringify({ operationName, variables: {} }) });
    paused(transport, { requestId: 'a' }, body('GetCart'));
    paused(transport, { requestId: 'b' }, body('GetUser'));
    await flush();
    expect(fulfilled(transport).map((f) => bodyOf(f.body))).toEqual(['"cart"', '"any"']);
  });

  it('is never answered by a response override when the page loads the URL as a script', async () => {
    const { transport } = await engineWith([response()]);
    paused(transport, { resourceType: 'Script' });
    await flush();
    expect(fulfilled(transport)).toHaveLength(0);
  });

  it('holds the answer back for its delay', async () => {
    vi.useFakeTimers();
    try {
      const { transport } = await engineWith([response({ response: { status: 200, delayMs: 1000, headers: [], send: true, patch: false } })]);
      paused(transport);
      await vi.advanceTimersByTimeAsync(999);
      expect(fulfilled(transport)).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1);
      expect(fulfilled(transport)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays quiet when the page gave up on a request while it was held', async () => {
    const { transport, events } = await engineWith([response()]);
    transport.failing.set('Fetch.fulfillRequest', 'Invalid InterceptionId.');
    paused(transport);
    await flush();
    expect(events.filter((e) => e.type === 'error')).toEqual([]);
  });

  it("never reads an event stream's body, even for an override that checks its upstream", async () => {
    const stream = 'https://a.com/live';
    const script = response({ kind: 'Script', request: undefined, response: undefined, originalHash: 'abc', match: { type: 'exact', pattern: stream, ignoreQuery: true } });
    const { transport } = await engineWith([script]);
    paused(transport, { resourceType: 'XHR', responseHeaders: [{ name: 'Content-Type', value: 'text/event-stream' }] }, { url: stream });
    await flush();
    expect(transport.sent('Fetch.getResponseBody')).toHaveLength(0);
  });
});

describe('OverrideStore with response overrides', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'console-editor-responses-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const input = { kind: 'Fetch' as const, sourceUrl: API, content: '{"a":1}', originalHash: null };

  it('keeps a response as .json with its request match and settings, across instances', async () => {
    const a = new OverrideStore(dir);
    await a.load();
    const o = await a.create({ ...input, request: { method: 'POST', operation: 'GetCart' }, response: { status: 201, delayMs: 500, headers: [], send: true, patch: false } });
    expect(await readFile(join(dir, 'files', `${o.id}.json`), 'utf8')).toBe('{"a":1}');
    await a.update(o.id, { response: { status: 404, delayMs: 0, headers: [{ operation: 'set', name: 'X-A', value: '1' }], send: true, patch: false } });

    const b = new OverrideStore(dir);
    await b.load();
    expect(b.meta(o.id)).toMatchObject({ request: { method: 'POST', operation: 'GetCart' }, response: { status: 404, delayMs: 0, headers: [{ operation: 'set', name: 'X-A', value: '1' }], send: true, patch: false } });
  });

  it('fills in any method and a plain 200 when they are left out', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    const o = await store.create(input);
    expect(o).toMatchObject({ request: { method: '*', operation: '' }, response: { status: 200, delayMs: 0, headers: [], send: true, patch: false } });
  });

  it('refuses a bad status, and a request match on a file override', async () => {
    const store = new OverrideStore(dir);
    await store.load();
    await expect(store.create({ ...input, response: { status: 700, delayMs: 0, headers: [], send: true, patch: false } })).rejects.toThrow(/status/);
    await expect(store.create({ kind: 'Script', sourceUrl: 'https://a.com/x.js', content: 'x', originalHash: null, request: { method: 'GET', operation: '' } })).rejects.toThrow(/response override/);
    const script = await store.create({ kind: 'Script', sourceUrl: 'https://a.com/x.js', content: 'x', originalHash: null });
    expect(script.request).toBeUndefined();
    await expect(store.update(script.id, { response: { status: 200, delayMs: 0, headers: [], send: true, patch: false } })).rejects.toThrow(/response override/);
  });

  it('falls back to the defaults for settings a hand edit broke', async () => {
    const a = new OverrideStore(dir);
    await a.load();
    const o = await a.create(input);
    const index = JSON.parse(await readFile(join(dir, 'overrides.json'), 'utf8'));
    index.overrides[0].response = { status: 'nope', delayMs: -1, headers: 'x' };
    index.overrides[0].request = { method: 'GET', operation: '' };
    await writeFile(join(dir, 'overrides.json'), JSON.stringify(index));

    const b = new OverrideStore(dir);
    await b.load();
    expect(b.get(o.id)).toMatchObject({ request: { method: 'GET', operation: '' }, response: { status: 200, delayMs: 0, headers: [], send: true, patch: false } });
  });
});
