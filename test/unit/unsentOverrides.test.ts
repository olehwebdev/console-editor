/**
 * Response overrides that aren't sent (Send request off): answered at the request stage, before the
 * server sees anything, with CORS for the page's origin and an answer to their preflight.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { computeFetchPatterns, InterceptionEngine } from '../../src/main/engine/InterceptionEngine';
import { OverrideStore } from '../../src/main/store/OverrideStore';
import { validateResponseSettings } from '../../src/shared/overrides';
import { DEFAULT_SETTINGS, type EngineEvent, type Override, type Rule } from '../../src/shared/types';

const API = 'https://api.b.com/orders';
const PAGE_ORIGIN = 'https://shop.a.com';

function unsent(partial: Partial<Override> = {}): Override {
  return {
    id: 'u1',
    kind: 'Fetch',
    sourceUrl: API,
    match: { type: 'exact', pattern: API, ignoreQuery: true },
    enabled: true,
    originalHash: null,
    request: { method: 'POST', operation: '' },
    response: { status: 201, delayMs: 0, headers: [{ operation: 'set', name: 'X-Mock', value: 'order' }], send: false },
    createdAt: 0,
    updatedAt: 0,
    content: '{"id":42}',
    ...partial,
  };
}

class FakeTransport implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  handlers = new Map<string, Set<(p: unknown) => void>>();
  responses: Record<string, unknown> = { 'Page.getFrameTree': { frameTree: { frame: { id: 'main', url: `${PAGE_ORIGIN}/` } } } };

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

async function engineWith(overrides: Override[], rules: Rule[] = []) {
  const transport = new FakeTransport();
  const events: EngineEvent[] = [];
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getRules: () => rules,
    getSettings: () => ({ ...DEFAULT_SETTINGS }),
    emit: (e) => events.push(e),
  });
  await engine.attach();
  transport.calls = [];
  return { transport, events };
}

/** A cross-origin fetch() of the API, paused before it is sent (no response yet). */
function pausedRequest(t: FakeTransport, request: Record<string, unknown> = {}) {
  t.emit('Fetch.requestPaused', {
    requestId: 'job',
    networkId: 'net-7',
    resourceType: 'XHR',
    frameId: 'main',
    request: { url: API, method: 'POST', headers: { Origin: PAGE_ORIGIN, 'Content-Type': 'application/json' }, postData: '{"sku":"A1"}', ...request },
  });
}

const preflightHeaders = (method: string) => ({ Origin: PAGE_ORIGIN, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': 'content-type' });
type Fulfil = { requestId: string; responseCode: number; responseHeaders: Array<{ name: string; value: string }>; body: string };
const fulfilled = (t: FakeTransport) => t.sent('Fetch.fulfillRequest').map((c) => c.params as Fulfil);
const header = (f: Fulfil, name: string) => f.responseHeaders.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
const bodyOf = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');

describe('patterns', () => {
  it('pause fetch() and XHR before they are sent, and not at their response', () => {
    const patterns = computeFetchPatterns([unsent(), unsent({ id: 'u2', enabled: false, match: { type: 'glob', pattern: 'https://x.test/*', ignoreQuery: true } })], [], DEFAULT_SETTINGS);
    expect(patterns).toEqual([{ urlPattern: `${API}*`, resourceType: 'XHR', requestStage: 'Request' }]);
  });
});

describe('answering before the request is sent', () => {
  it("answers with the override's status, headers and body, a JSON type and CORS for the page's origin", async () => {
    const { transport, events } = await engineWith([unsent()]);
    pausedRequest(transport);
    await flush();

    expect(transport.sent('Fetch.continueRequest')).toEqual([]);
    const [answer] = fulfilled(transport);
    expect(answer!.responseCode).toBe(201);
    expect(bodyOf(answer!.body)).toBe('{"id":42}');
    expect(header(answer!, 'X-Mock')).toBe('order');
    expect(header(answer!, 'Content-Type')).toBe('application/json; charset=utf-8');
    expect(header(answer!, 'Access-Control-Allow-Origin')).toBe(PAGE_ORIGIN);
    expect(header(answer!, 'Access-Control-Allow-Credentials')).toBe('true');
    expect(events).toContainEqual({ type: 'override-served', overrideId: 'u1', url: API, requestId: 'net-7' });
  });

  it('answers the preflight asking to send one, whatever GraphQL operation the override names', async () => {
    const { transport } = await engineWith([unsent({ request: { method: 'POST', operation: 'PlaceOrder' } })]);
    pausedRequest(transport, { method: 'OPTIONS', headers: preflightHeaders('POST'), postData: undefined });
    await flush();

    const [answer] = fulfilled(transport);
    expect(answer!.responseCode).toBe(204);
    expect(bodyOf(answer!.body)).toBe('');
    expect(header(answer!, 'Access-Control-Allow-Origin')).toBe(PAGE_ORIGIN);
    expect(header(answer!, 'Access-Control-Allow-Methods')).toBe('POST');
    expect(header(answer!, 'Access-Control-Allow-Headers')).toBe('content-type');
  });

  it('lets other methods, operations and preflights go on to the server', async () => {
    const { transport } = await engineWith([unsent({ request: { method: 'POST', operation: 'PlaceOrder' } })]);
    pausedRequest(transport, { method: 'PUT' });
    pausedRequest(transport, { postData: JSON.stringify({ operationName: 'GetOrders' }) });
    pausedRequest(transport, { method: 'OPTIONS', headers: preflightHeaders('DELETE'), postData: undefined });
    await flush();
    expect(fulfilled(transport)).toEqual([]);
    expect(transport.sent('Fetch.continueRequest')).toHaveLength(3);
  });

  it('leaves an override that is sent to the response stage', async () => {
    const { transport } = await engineWith([unsent({ response: { status: 200, delayMs: 0, headers: [], send: true } })]);
    pausedRequest(transport);
    await flush();
    expect(fulfilled(transport)).toEqual([]);
    expect(transport.sent('Fetch.continueRequest')).toHaveLength(1);
  });

  it('keeps a blocked request blocked', async () => {
    const block: Rule = { id: 'b1', action: 'block', match: { type: 'exact', pattern: API, ignoreQuery: true }, resourceTypes: [], enabled: true, createdAt: 0, updatedAt: 0 };
    const { transport } = await engineWith([unsent()], [block]);
    pausedRequest(transport);
    await flush();
    expect(fulfilled(transport)).toEqual([]);
    expect(transport.sent('Fetch.failRequest')).toHaveLength(1);
  });

  it('holds the answer back for its delay', async () => {
    vi.useFakeTimers();
    try {
      const { transport } = await engineWith([unsent({ response: { status: 200, delayMs: 800, headers: [], send: false } })]);
      pausedRequest(transport);
      await vi.advanceTimersByTimeAsync(700);
      expect(fulfilled(transport)).toEqual([]);
      await vi.advanceTimersByTimeAsync(200);
      expect(fulfilled(transport)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('the send setting', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'console-editor-unsent-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('is on or off', () => {
    expect(validateResponseSettings({ status: 200, delayMs: 0, headers: [], send: false })).toBeNull();
    expect(validateResponseSettings({ status: 200, delayMs: 0, headers: [], send: 'no' as never })).toMatch(/Send request/);
  });

  it('is kept, and an override saved before it existed is sent', async () => {
    const a = new OverrideStore(dir);
    await a.load();
    const off = await a.create({ kind: 'Fetch', sourceUrl: API, content: '{}', originalHash: null, response: { status: 200, delayMs: 0, headers: [], send: false } });
    const old = await a.create({ kind: 'Fetch', sourceUrl: `${API}/old`, content: '{}', originalHash: null });
    const index = JSON.parse(await readFile(join(dir, 'overrides.json'), 'utf8'));
    delete index.overrides.find((o: Override) => o.id === old.id).response.send;
    await writeFile(join(dir, 'overrides.json'), JSON.stringify(index));

    const b = new OverrideStore(dir);
    await b.load();
    expect(b.meta(off.id)?.response).toMatchObject({ send: false });
    expect(b.meta(old.id)?.response).toEqual({ status: 200, delayMs: 0, headers: [], send: true });
  });
});
