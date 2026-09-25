import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { NetworkLog } from '../../src/main/network';
import { MAX_NETWORK_REQUESTS } from '../../src/shared/constants';
import type { AppEvent, NetworkRequest } from '../../src/shared/types';

class FakeTransport implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown>; sessionId?: string }> = [];
  handlers = new Map<string, Set<(p: unknown, sessionId?: string) => void>>();
  responses: Record<string, unknown> = {};
  failing = new Set<string>();

  async send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T> {
    this.calls.push({ method, params, sessionId });
    if (this.failing.has(method)) throw new Error(`${method} failed`);
    return this.responses[method] as T;
  }

  on(event: string, handler: (p: unknown, sessionId?: string) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown, sessionId?: string): void {
    for (const h of this.handlers.get(event) ?? []) h(params, sessionId);
  }
}

let transport: FakeTransport;
let events: AppEvent[];
let log: NetworkLog;

beforeEach(() => {
  vi.useFakeTimers();
  transport = new FakeTransport();
  events = [];
  log = new NetworkLog({ transport, send: (e) => events.push(e) });
});

afterEach(() => {
  log.dispose();
  vi.useRealTimers();
});

const sent = (requestId: string, url: string, extra: Record<string, unknown> = {}, sessionId?: string) =>
  transport.emit(
    'Network.requestWillBeSent',
    { requestId, loaderId: 'L', frameId: 'F1', type: 'Fetch', timestamp: 100, wallTime: 1_700_000_000, request: { url, method: 'GET', headers: { Accept: '*/*' } }, ...extra },
    sessionId,
  );
const responded = (requestId: string, response: Record<string, unknown> = {}, sessionId?: string, type = 'Fetch') =>
  transport.emit('Network.responseReceived', { requestId, type, response: { url: 'x', status: 200, mimeType: 'application/json', headers: { 'Content-Type': 'application/json' }, ...response } }, sessionId);
const finished = (requestId: string, sessionId?: string, timestamp = 100.25) =>
  transport.emit('Network.loadingFinished', { requestId, timestamp, encodedDataLength: 1234 }, sessionId);

/** The rows every batch sent so far carried, latest state per id. */
function batched(): NetworkRequest[] {
  vi.advanceTimersByTime(60);
  const byId = new Map<string, NetworkRequest>();
  for (const e of events) if (e.type === 'network-requests') for (const r of e.requests) byId.set(r.id, r);
  return [...byId.values()];
}

describe('NetworkLog', () => {
  it('follows a request from sent to finished, and sends it in batches', () => {
    sent('r1', 'https://a.com/api/cart');
    responded('r1');
    finished('r1');
    vi.advanceTimersByTime(60);
    expect(events.filter((e) => e.type === 'network-requests')).toHaveLength(1);
    expect(log.list()).toEqual([
      {
        id: '1',
        url: 'https://a.com/api/cart',
        method: 'GET',
        type: 'Fetch',
        state: 'done',
        status: 200,
        mimeType: 'application/json',
        size: 1234,
        startedAt: 1_700_000_000_000,
        duration: 250,
        frameId: 'F1',
        hasBody: false,
        pageLoad: 0,
      },
    ]);
  });

  it("labels a worker's requests with the worker, not a frame", () => {
    transport.emit('Target.attachedToTarget', { sessionId: 'W', targetInfo: { type: 'worker', url: 'https://a.com/w.js' } });
    sent('r1', 'https://a.com/api/prices', {}, 'W');
    const [row] = batched();
    expect(row.worker).toEqual({ type: 'worker', url: 'https://a.com/w.js' });
    expect(row.frameId).toBeUndefined();
  });

  it('keeps a request id per session apart', () => {
    sent('r1', 'https://a.com/one');
    sent('r1', 'https://b.com/two', {}, 'IFRAME');
    responded('r1', { status: 404 }, 'IFRAME');
    expect(log.list().map((r) => [r.url, r.status])).toEqual([
      ['https://a.com/one', 0],
      ['https://b.com/two', 404],
    ]);
  });

  it("ends a redirect's hop with its status, and follows the next hop in a row of its own", () => {
    sent('r1', 'https://a.com/old');
    sent('r1', 'https://a.com/new', { timestamp: 100.1, redirectResponse: { url: 'https://a.com/old', status: 302, mimeType: '', headers: { Location: '/new' } } });
    responded('r1');
    expect(log.list().map((r) => [r.url, r.status, r.state])).toEqual([
      ['https://a.com/old', 302, 'done'],
      ['https://a.com/new', 200, 'pending'],
    ]);
  });

  it('says why a request failed', () => {
    sent('a', 'https://a.com/a');
    sent('b', 'https://a.com/b');
    sent('c', 'https://a.com/c');
    transport.emit('Network.loadingFailed', { requestId: 'a', timestamp: 101, errorText: 'net::ERR_ABORTED', canceled: true });
    transport.emit('Network.loadingFailed', { requestId: 'b', timestamp: 101, errorText: 'net::ERR_BLOCKED_BY_CLIENT', blockedReason: 'inspector' });
    transport.emit('Network.loadingFailed', { requestId: 'c', timestamp: 101, errorText: 'net::ERR_CONNECTION_REFUSED' });
    expect(log.list().map((r) => [r.state, r.error])).toEqual([
      ['failed', 'Cancelled'],
      ['failed', 'Blocked (inspector)'],
      ['failed', 'net::ERR_CONNECTION_REFUSED'],
    ]);
  });

  it("counts page loads from the main frame's own navigations, not an iframe's or another session's", () => {
    const navigation = (requestId: string, frameId: string, sessionId?: string) =>
      sent(requestId, `https://a.com/${requestId}`, { loaderId: requestId, frameId, type: 'Document' }, sessionId);
    navigation('first', 'MAIN');
    transport.emit('Page.frameNavigated', { frame: { id: 'MAIN', url: 'https://a.com/first' } });
    sent('x', 'https://a.com/api');
    navigation('frame', 'CHILD');
    navigation('other', 'MAIN', 'IFRAME');
    navigation('second', 'MAIN');
    sent('y', 'https://a.com/api');
    expect(log.list().map((r) => [r.url.slice('https://a.com/'.length), r.pageLoad])).toEqual([
      ['first', 0],
      ['api', 0],
      ['frame', 0],
      ['other', 0],
      ['second', 1],
      ['api', 1],
    ]);
  });

  it('names the GraphQL operation a request body names', () => {
    sent('g', 'https://a.com/graphql', { request: { url: 'https://a.com/graphql', method: 'POST', hasPostData: true, postData: '{"operationName":"GetCart"}' } });
    expect(log.list()[0]).toMatchObject({ hasBody: true, operation: 'GetCart' });
  });

  it('marks the request an override answered, whichever session reported it', () => {
    sent('n1', 'https://a.com/api', {}, 'WORKER');
    log.engineEvent({ type: 'override-served', overrideId: 'o1', url: 'https://a.com/api', requestId: 'n1' });
    log.engineEvent({ type: 'override-served', overrideId: 'o2', url: 'https://a.com/other' });
    expect(batched().map((r) => r.overrideId)).toEqual(['o1']);
  });

  it(`keeps the most recent ${MAX_NETWORK_REQUESTS} requests`, () => {
    for (let i = 0; i < MAX_NETWORK_REQUESTS + 5; i++) sent(`r${i}`, `https://a.com/${i}`);
    const rows = log.list();
    expect(rows).toHaveLength(MAX_NETWORK_REQUESTS);
    expect(rows[0].url).toBe('https://a.com/5');
    responded('r0');
    expect(log.list()[0].status).toBe(0);
  });

  it('clears, and tells the renderer', () => {
    sent('r1', 'https://a.com/a');
    log.clear();
    vi.advanceTimersByTime(60);
    expect(log.list()).toEqual([]);
    expect(events).toEqual([{ type: 'network-cleared' }]);
  });

  describe('details and bodies', () => {
    it('prefers the headers as they went over the wire, and reads a body it was not given through its session', async () => {
      sent('p', 'https://a.com/upload', { request: { url: 'https://a.com/upload', method: 'POST', hasPostData: true, headers: { A: '1' } } }, 'S');
      transport.emit('Network.requestWillBeSentExtraInfo', { requestId: 'p', headers: { A: '1', Cookie: 'k=v' } }, 'S');
      transport.responses['Network.getRequestPostData'] = { postData: 'x=1' };
      const detail = await log.detail('1');
      expect(detail.requestHeaders).toEqual([
        { name: 'A', value: '1' },
        { name: 'Cookie', value: 'k=v' },
      ]);
      expect(detail.body).toBe('x=1');
      expect(transport.calls).toEqual([{ method: 'Network.getRequestPostData', params: { requestId: 'p' }, sessionId: 'S' }]);
      await log.detail('1');
      expect(transport.calls).toHaveLength(1);
    });

    it('reads a finished response through the session that received it, as text', async () => {
      sent('r', 'https://a.com/api', {}, 'S');
      responded('r', { headers: { 'Content-Type': 'application/json; charset=utf-8' } }, 'S');
      finished('r', 'S');
      transport.responses['Network.getResponseBody'] = { body: Buffer.from('{"é":1}').toString('base64'), base64Encoded: true };
      expect(await log.responseBody('1')).toEqual({ available: true, text: '{"é":1}', binary: false });
      expect(transport.calls[0]).toMatchObject({ method: 'Network.getResponseBody', sessionId: 'S' });
    });

    it('says an image is binary, and never reads an event stream, one still arriving, or one that never came', async () => {
      sent('img', 'https://a.com/a.png');
      responded('img', { mimeType: 'image/png' });
      finished('img');
      transport.responses['Network.getResponseBody'] = { body: 'iVBORw0KGgo=', base64Encoded: true };
      expect(await log.responseBody('1')).toEqual({ available: true, text: '', binary: true });

      sent('sse', 'https://a.com/live');
      responded('sse', { mimeType: 'text/event-stream' });
      sent('slow', 'https://a.com/slow');
      sent('dead', 'https://a.com/dead');
      transport.emit('Network.loadingFailed', { requestId: 'dead', timestamp: 101, errorText: 'net::ERR_FAILED' });
      transport.calls = [];
      expect(await log.responseBody('2')).toEqual({ available: false, gap: 'stream' });
      expect(await log.responseBody('3')).toEqual({ available: false, gap: 'pending' });
      expect(await log.responseBody('4')).toEqual({ available: false, gap: 'failed' });
      expect(transport.calls).toEqual([]);
    });

    it("says a body Chromium no longer holds is gone, and refuses a request it doesn't keep", async () => {
      sent('r', 'https://a.com/api');
      responded('r');
      finished('r');
      transport.failing.add('Network.getResponseBody');
      expect(await log.responseBody('1')).toEqual({ available: false, gap: 'gone' });
      await expect(log.detail('404')).rejects.toThrow(/no longer/);
      await expect(log.responseBody(7)).rejects.toThrow(/no longer/);
    });
  });
});
