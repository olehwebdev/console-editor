/**
 * Breakpoints: kept on the workspace, turned into `Fetch` patterns, and the requests they stop held
 * until the user decides (continue, send edited, respond, fail), at either stage. The page's held
 * requests are let go when the page gives up on one, or its session goes.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { computeFetchPatterns, InterceptionEngine, type HoldInput } from '../../src/main/engine/InterceptionEngine';
import { HeldRequests, NetworkLog } from '../../src/main/network';
import { SessionStore } from '../../src/main/store/SessionStore';
import { validateBreakpoint, validateHeldAction } from '../../src/shared/breakpoints';
import { DEFAULT_SETTINGS, type AppEvent, type Breakpoint, type HeldAction, type Override } from '../../src/shared/types';

const API = 'https://api.b.com/cart';
const PAGE_ORIGIN = 'https://shop.a.com';

const breakpoint = (partial: Partial<Breakpoint> = {}): Breakpoint => ({
  id: 'bp1',
  match: { type: 'exact', pattern: API, ignoreQuery: true },
  method: '*',
  stage: 'request',
  enabled: true,
  ...partial,
});

class FakeTransport implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  handlers = new Map<string, Set<(p: unknown, sessionId?: string) => void>>();
  responses: Record<string, unknown> = { 'Page.getFrameTree': { frameTree: { frame: { id: 'main', url: `${PAGE_ORIGIN}/` } } } };

  async send<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    this.calls.push({ method, params });
    return (this.responses[method] ?? {}) as T;
  }

  on(event: string, handler: (p: unknown, sessionId?: string) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown, sessionId?: string): void {
    for (const h of [...(this.handlers.get(event) ?? [])]) h(params, sessionId);
  }

  sent(method: string) {
    return this.calls.filter((c) => c.method === method).map((c) => c.params as Record<string, any>);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** An engine whose holds wait for `decide`: each held request is recorded with how to answer it. */
async function engineWith(breakpoints: Breakpoint[], overrides: Override[] = []) {
  const transport = new FakeTransport();
  const held: Array<{ input: HoldInput; owner: object; decide(action: HeldAction | undefined): void }> = [];
  const released: object[] = [];
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getRules: () => [],
    getSettings: () => ({ ...DEFAULT_SETTINGS }),
    getBreakpoints: () => breakpoints,
    hold: (input, owner) => new Promise((decide) => held.push({ input, owner, decide })),
    releaseHeld: (owner) => released.push(owner),
    emit: () => undefined,
  });
  await engine.attach();
  transport.calls = [];
  return { transport, held, released, engine };
}

/** A cross-origin fetch() of the API, paused before it is sent. */
function beforeSending(t: FakeTransport, request: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  t.emit('Fetch.requestPaused', {
    requestId: 'job',
    networkId: 'net-9',
    resourceType: 'XHR',
    frameId: 'main',
    request: { url: API, method: 'POST', headers: { Origin: PAGE_ORIGIN, 'Content-Type': 'application/json' }, postData: '{"sku":"A1"}', ...request },
    ...extra,
  });
}

/** The same fetch(), paused once its JSON response arrived. */
function atResponse(t: FakeTransport, extra: Record<string, unknown> = {}) {
  beforeSending(t, {}, {
    responseStatusCode: 200,
    responseStatusText: 'OK',
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Content-Length', value: '15' },
      { name: 'Access-Control-Allow-Origin', value: PAGE_ORIGIN },
    ],
    ...extra,
  });
}

const header = (headers: Array<{ name: string; value: string }>, name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
const bodyOf = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');

describe('breakpoints on the workspace', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'console-editor-breakpoints-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('checks each: an id, a URL pattern as a rule takes, a method, a stage, on or off', () => {
    expect(validateBreakpoint(breakpoint())).toBeNull();
    expect(validateBreakpoint(breakpoint({ id: 'a b' }))).toMatch(/id/);
    expect(validateBreakpoint(breakpoint({ stage: 'later' as never }))).toMatch(/before it is sent/);
    expect(validateBreakpoint(breakpoint({ method: 'get' }))).toMatch(/method/);
    expect(validateBreakpoint(breakpoint({ match: { type: 'regex', pattern: '(', ignoreQuery: true } }))).toMatch(/regular expression/);
    expect(validateBreakpoint(breakpoint({ match: null as never }))).toMatch(/URL pattern/);
    expect(validateBreakpoint(breakpoint({ enabled: 'yes' as never }))).toMatch(/on or off/);
  });

  it('keeps them per workspace across a restart, and refuses a bad list whole', async () => {
    const a = new SessionStore(dir);
    await a.load();
    const other = await a.create();
    const updated = await a.update(a.activeId, { breakpoints: [breakpoint({ match: { type: 'glob', pattern: '  https://api.b.com/*  ', ignoreQuery: true } })] });
    expect(updated.breakpoints).toEqual([breakpoint({ match: { type: 'glob', pattern: 'https://api.b.com/*', ignoreQuery: true } })]);
    await expect(a.update(a.activeId, { breakpoints: [breakpoint(), breakpoint()] })).rejects.toThrow(/same id/);
    await expect(a.update(a.activeId, { breakpoints: 'all' as never })).rejects.toThrow(/list/);

    const b = new SessionStore(dir);
    await b.load();
    const { workspaces } = b.workspaces();
    expect(workspaces.find((w) => w.id === a.activeId)!.breakpoints).toHaveLength(1);
    expect(workspaces.find((w) => w.id === other.id)!.breakpoints).toEqual([]);
  });
});

describe('what the page is told to pause', () => {
  it("pauses fetch() and XHR at each enabled breakpoint's stage", () => {
    const patterns = computeFetchPatterns([], [], DEFAULT_SETTINGS, [
      breakpoint(),
      breakpoint({ id: 'bp2', stage: 'response', match: { type: 'regex', pattern: 'graphql', ignoreQuery: false } }),
      breakpoint({ id: 'bp3', enabled: false, match: { type: 'glob', pattern: 'https://off.test/*', ignoreQuery: true } }),
    ]);
    expect(patterns).toEqual([
      { urlPattern: `${API}*`, resourceType: 'XHR', requestStage: 'Request' },
      { urlPattern: '*', resourceType: 'XHR', requestStage: 'Response' },
    ]);
  });
});

describe('holding a request before it is sent', () => {
  it('holds it with what it was to send, and sends nothing until told', async () => {
    const { transport, held } = await engineWith([breakpoint()]);
    beforeSending(transport);
    await flush();
    expect(held).toHaveLength(1);
    expect(held[0]!.input).toEqual({
      breakpointId: 'bp1',
      stage: 'request',
      url: API,
      method: 'POST',
      requestHeaders: [
        { name: 'Origin', value: PAGE_ORIGIN },
        { name: 'Content-Type', value: 'application/json' },
      ],
      requestBody: '{"sku":"A1"}',
      networkId: 'net-9',
    });
    expect(transport.calls).toEqual([]);
  });

  it('continues it as it would have gone', async () => {
    const { transport, held } = await engineWith([breakpoint()]);
    beforeSending(transport);
    await flush();
    held[0]!.decide({ type: 'continue' });
    await flush();
    expect(transport.sent('Fetch.continueRequest')).toEqual([{ requestId: 'job' }]);
  });

  it('sends it edited: method, URL, header changes on its own, and body', async () => {
    const { transport, held } = await engineWith([breakpoint()]);
    beforeSending(transport);
    await flush();
    held[0]!.decide({ type: 'send', url: `${API}?v=2`, method: 'PUT', headers: [{ operation: 'set', name: 'X-Debug', value: '1' }, { operation: 'remove', name: 'Origin', value: '' }], body: '{"sku":"B2"}' });
    await flush();
    const [sent] = transport.sent('Fetch.continueRequest');
    expect(sent).toMatchObject({ requestId: 'job', url: `${API}?v=2`, method: 'PUT', headers: [{ name: 'Content-Type', value: 'application/json' }, { name: 'X-Debug', value: '1' }] });
    expect(bodyOf(sent!.postData)).toBe('{"sku":"B2"}');
  });

  it("answers it without sending it, readable by the page's origin", async () => {
    const { transport, held } = await engineWith([breakpoint()]);
    beforeSending(transport);
    await flush();
    held[0]!.decide({ type: 'respond', status: 409, headers: [{ operation: 'set', name: 'X-Mock', value: 'conflict' }], body: '{"error":"sold out"}' });
    await flush();
    const [answer] = transport.sent('Fetch.fulfillRequest');
    expect(answer!.responseCode).toBe(409);
    expect(bodyOf(answer!.body)).toBe('{"error":"sold out"}');
    expect(header(answer!.responseHeaders, 'Content-Type')).toBe('application/json; charset=utf-8');
    expect(header(answer!.responseHeaders, 'X-Mock')).toBe('conflict');
    expect(header(answer!.responseHeaders, 'Access-Control-Allow-Origin')).toBe(PAGE_ORIGIN);
    expect(transport.sent('Fetch.continueRequest')).toEqual([]);
  });

  it('fails it with the network error picked, and does nothing for one the page gave up on', async () => {
    const { transport, held } = await engineWith([breakpoint()]);
    beforeSending(transport);
    beforeSending(transport, {}, { requestId: 'job-2', networkId: 'net-10' });
    await flush();
    held[0]!.decide({ type: 'fail', reason: 'ConnectionRefused' });
    held[1]!.decide(undefined);
    await flush();
    expect(transport.sent('Fetch.failRequest')).toEqual([{ requestId: 'job', errorReason: 'ConnectionRefused' }]);
    expect(transport.calls).toHaveLength(1);
  });

  it("never holds a preflight, another method or type, or with the breakpoint off", async () => {
    const { transport, held } = await engineWith([breakpoint({ method: 'POST' }), breakpoint({ id: 'off', enabled: false, match: { type: 'glob', pattern: '*', ignoreQuery: true } })]);
    beforeSending(transport, { method: 'OPTIONS', headers: { Origin: PAGE_ORIGIN, 'Access-Control-Request-Method': 'POST' }, postData: undefined });
    beforeSending(transport, { method: 'GET', postData: undefined });
    beforeSending(transport, {}, { resourceType: 'Script' });
    beforeSending(transport, { url: 'https://other.test/x' });
    await flush();
    expect(held).toEqual([]);
    expect(transport.sent('Fetch.continueRequest')).toHaveLength(4);
  });

  it('is let go when its session goes', async () => {
    const { engine, released } = await engineWith([breakpoint()]);
    engine.detach();
    expect(released).toEqual([engine]);
  });
});

describe('holding a response', () => {
  it('holds it with its status, headers and body, then lets it go on as it would have', async () => {
    const { transport, held } = await engineWith([breakpoint({ stage: 'response' })]);
    transport.responses['Fetch.getResponseBody'] = { body: Buffer.from('{"items":[1]}').toString('base64'), base64Encoded: true };
    atResponse(transport);
    await flush();
    expect(held[0]!.input).toMatchObject({
      stage: 'response',
      response: { status: 200, statusText: 'OK', headers: expect.arrayContaining([{ name: 'Content-Type', value: 'application/json' }]), body: '{"items":[1]}' },
    });
    held[0]!.decide({ type: 'continue' });
    await flush();
    expect(transport.sent('Fetch.continueRequest')).toEqual([{ requestId: 'job' }]);
  });

  it("answers the page instead with the user's status, body and header changes on the response's own", async () => {
    const { transport, held } = await engineWith([breakpoint({ stage: 'response' })]);
    atResponse(transport);
    await flush();
    held[0]!.decide({ type: 'respond', status: 500, headers: [{ operation: 'remove', name: 'Access-Control-Allow-Origin', value: '' }], body: '{"items":[]}' });
    await flush();
    const [answer] = transport.sent('Fetch.fulfillRequest');
    expect(answer!.responseCode).toBe(500);
    expect(bodyOf(answer!.body)).toBe('{"items":[]}');
    expect(header(answer!.responseHeaders, 'Access-Control-Allow-Origin')).toBeUndefined();
    // Reframed for the new body.
    expect(header(answer!.responseHeaders, 'Content-Length')).toBeUndefined();
  });

  it('never holds an event stream or a redirect', async () => {
    const { transport, held } = await engineWith([breakpoint({ stage: 'response' })]);
    atResponse(transport, { responseHeaders: [{ name: 'Content-Type', value: 'text/event-stream' }] });
    atResponse(transport, { responseStatusCode: 302, responseHeaders: [{ name: 'Location', value: '/next' }] });
    await flush();
    expect(held).toEqual([]);
    expect(transport.sent('Fetch.getResponseBody')).toEqual([]);
  });
});

describe("the page's held requests", () => {
  function registry() {
    const transport = new FakeTransport();
    const events: AppEvent[] = [];
    const marks: Array<[string, string | undefined]> = [];
    const held = new HeldRequests({ transport, send: (e) => events.push(e), mark: (n, h) => marks.push([n, h]) });
    const input: HoldInput = { breakpointId: 'bp1', stage: 'response', url: API, method: 'GET', requestHeaders: [], networkId: 'net-1' };
    return { transport, events, marks, held, input };
  }

  it('lists each with an id and time, marks its row, and tells the renderer', async () => {
    const { held, events, marks, input } = registry();
    void held.hold(input, {});
    expect(held.list()).toEqual([expect.objectContaining({ id: 'held-1', breakpointId: 'bp1', heldAt: expect.any(Number) })]);
    expect(held.list()[0]).not.toHaveProperty('networkId');
    expect(marks).toEqual([['net-1', 'held-1']]);
    expect(events).toEqual([{ type: 'held-requests', held: held.list() }]);
  });

  it("resumes one with a checked action, and refuses one it can't take", async () => {
    const { held, marks, input, events } = registry();
    const decided = held.hold(input, {});
    expect(() => held.resume('held-1', { type: 'send', url: API, method: 'GET', headers: [] })).toThrow(/sent already/);
    expect(() => held.resume('held-1', { type: 'respond', status: 42, headers: [], body: '' })).toThrow(/status/);
    held.resume('held-1', { type: 'respond', status: 200, headers: [], body: '{}' });
    await expect(decided).resolves.toEqual({ type: 'respond', status: 200, headers: [], body: '{}' });
    expect(held.list()).toEqual([]);
    expect(marks.at(-1)).toEqual(['net-1', undefined]);
    expect(events.at(-1)).toEqual({ type: 'held-requests', held: [] });
    expect(() => held.resume('held-1', { type: 'continue' })).toThrow(/no longer held/);
  });

  it('lets one go when the page gives up on it, or its session goes', async () => {
    const { held, transport, input } = registry();
    const owner = {};
    const abandoned = held.hold(input, {});
    const orphaned = held.hold({ ...input, networkId: 'net-2' }, owner);
    transport.emit('Network.loadingFailed', { requestId: 'net-1', canceled: true });
    await expect(abandoned).resolves.toBeUndefined();
    held.releaseOwner(owner);
    await expect(orphaned).resolves.toBeUndefined();
    expect(held.list()).toEqual([]);
  });

  it('checks every kind of action', () => {
    expect(validateHeldAction({ type: 'continue' })).toBeNull();
    expect(validateHeldAction({ type: 'send', url: 'ftp://x', method: 'GET', headers: [] })).toMatch(/web address/);
    expect(validateHeldAction({ type: 'send', url: API, method: 'get', headers: [] })).toMatch(/method/);
    expect(validateHeldAction({ type: 'send', url: API, method: 'GET', headers: [{ operation: 'set', name: 'Content-Length', value: '1' }] })).toMatch(/frames/);
    expect(validateHeldAction({ type: 'respond', status: 200, headers: [], body: 7 as never })).toMatch(/text/);
    expect(validateHeldAction({ type: 'fail', reason: 'Meltdown' as never })).toMatch(/network error/);
    expect(validateHeldAction({ type: 'retry' } as never)).toMatch(/Unknown action/);
  });
});

describe('the request log', () => {
  it("marks a held request's row until it is let go", async () => {
    const transport = new FakeTransport();
    const log = new NetworkLog({ transport, send: () => undefined });
    transport.emit('Network.requestWillBeSent', { requestId: 'net-1', loaderId: 'L', frameId: 'main', type: 'Fetch', timestamp: 1, wallTime: 1, request: { url: API, method: 'GET', headers: {} } });
    void log.held.hold({ breakpointId: 'bp1', stage: 'request', url: API, method: 'GET', requestHeaders: [], networkId: 'net-1' }, {});
    expect(log.list()[0]!.heldId).toBe('held-1');
    log.held.resume('held-1', { type: 'continue' });
    expect(log.list()[0]).not.toHaveProperty('heldId');
    log.dispose();
  });
});
