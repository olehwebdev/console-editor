/**
 * The Network panel's log and response overrides against a real Chromium (docs/NETWORK_PANEL.md §2):
 * what the log lists for fetch(), XHR, GraphQL, an event stream and a worker's fetch, which bodies
 * it reads, and how a response override (kind Fetch) answers: body, status, header changes and a
 * delay, matched by method and GraphQL operation, never touching an event stream. Where Chromium
 * versions differ (141 here, 152 in Electron 44), only what both do is asserted.
 */
import type { Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { NetworkLog } from '../../src/main/network';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type AppEvent, type EngineEvent, type NetworkRequest, type Override, type RequestMatch, type ResponseSettings } from '../../src/shared/types';
import { BROKEN_PATH, CART_JSON, CART_PATH, EVENTS_PATH, GRAPHQL_JSON, GRAPHQL_PATH, NETWORK_PATH, WORKER_DATA_PATH } from '../fixtures/networkPages';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 10_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

let nextId = 1;

describe.skipIf(!chromiumAvailable)('the Network panel in Chromium', () => {
  let site: FixtureSite;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let log: NetworkLog;
  let detachTransport: () => Promise<void>;
  let overrides: Override[];
  let events: EngineEvent[];
  let sent: AppEvent[];

  const url = (path: string) => `${site.url}${path}`;
  const state = (expr: string) => page.evaluate(expr);
  const rows = () => log.list();
  /** The newest row for a URL (and method), once the log has it in the state asked for. */
  const row = (path: string, where: (r: NetworkRequest) => boolean = (r) => r.state !== 'pending') =>
    waitFor(() => rows().filter((r) => r.url.startsWith(url(path)) && where(r)).at(-1));

  function responseOverride(path: string, content: string, request: RequestMatch, response: Partial<ResponseSettings> = {}): Override {
    const id = `o${nextId++}`;
    return {
      id,
      kind: 'Fetch',
      sourceUrl: url(path),
      match: defaultMatcherFor(url(path)),
      enabled: true,
      originalHash: null,
      request,
      response: { status: 200, delayMs: 0, headers: [], send: true, ...response },
      createdAt: 0,
      updatedAt: 0,
      content,
    };
  }

  async function setOverrides(next: Override[]): Promise<void> {
    overrides = next;
    await interception.refreshInterception();
  }

  beforeAll(async () => {
    site = await startFixtureSite();
    chrome = await launchChromium();
  });

  afterAll(async () => {
    await chrome?.close();
    await site?.close();
  });

  beforeEach(async () => {
    overrides = [];
    events = [];
    sent = [];
    const opened = await chrome.newPage();
    page = opened.page;
    detachTransport = () => opened.transport.detach();
    log = new NetworkLog({ transport: opened.transport, send: (e) => sent.push(e) });
    interception = new PageInterception({
      transport: opened.transport,
      getOverrides: () => overrides,
      getRules: () => [],
      getSettings: () => ({ ...DEFAULT_SETTINGS }),
      emit: (e) => {
        events.push(e);
        log.engineEvent(e);
      },
      fallbackFetch: async (u) => (await fetch(u)).text(),
    });
    await interception.attach();
  });

  afterEach(async () => {
    interception.detach();
    log.dispose();
    await detachTransport();
    await page.close();
  });

  describe('the log', () => {
    it("lists the page's fetch(), GraphQL and failing calls, its event stream and its worker's fetch", async () => {
      await page.goto(url(NETWORK_PATH));
      await waitFor(() => state('window.workerData && window.user && window.cart'));
      expect(await state('loadBroken()')).toBe(500);

      const cart = await row(CART_PATH);
      expect(cart).toMatchObject({ method: 'GET', type: 'Fetch', state: 'done', status: 200, mimeType: 'application/json', hasBody: false });
      expect(cart.frameId).toBeTruthy();
      expect(cart.size).toBeGreaterThan(0);
      expect(cart.duration).toBeGreaterThanOrEqual(0);

      const gql = await row(GRAPHQL_PATH);
      expect(gql).toMatchObject({ method: 'POST', type: 'Fetch', operation: 'GetUser', hasBody: true });

      // A response the page never reads to the end may never finish: its status is known before its body.
      expect(await row(BROKEN_PATH, (r) => r.status !== 0)).toMatchObject({ status: 500 });

      // An event stream stays pending for as long as it is open.
      expect(await row(EVENTS_PATH, (r) => r.status !== 0)).toMatchObject({ type: 'EventSource', state: 'pending', status: 200 });

      // A dedicated worker's fetch comes from the worker's session: no frame, the worker named.
      const fromWorker = await row(WORKER_DATA_PATH);
      expect(fromWorker.frameId).toBeUndefined();
      expect(fromWorker.worker).toEqual({ type: 'worker', url: url('/network/worker.js') });

      // Rows reach the renderer in batches.
      await waitFor(() => sent.some((e) => e.type === 'network-requests'));
    });

    it('counts page loads, so the rows of an earlier one can go', async () => {
      await page.goto(url(NETWORK_PATH));
      const first = (await row(CART_PATH)).pageLoad;
      await page.reload();
      await waitFor(() => rows().some((r) => r.url === url(CART_PATH) && r.pageLoad === first + 1));
      expect(rows().find((r) => r.url === url(NETWORK_PATH) && r.pageLoad === first + 1)).toMatchObject({ type: 'Document' });
      await page.goto(url('/'));
      await waitFor(() => rows().some((r) => r.url === url('/app.js') && r.pageLoad === first + 2));
    });

    it("reads a request's body and a response's, but never an open event stream's (it would end it)", async () => {
      await page.goto(url(NETWORK_PATH));
      const gql = await row(GRAPHQL_PATH);
      expect(JSON.parse((await log.detail(gql.id)).body!)).toMatchObject({ operationName: 'GetUser' });
      const detail = await log.detail((await row(CART_PATH)).id);
      expect(detail.statusText).toBe('OK');
      expect(detail.responseHeaders.find((h) => h.name.toLowerCase() === 'content-type')?.value).toBe('application/json');

      expect(await log.responseBody((await row(CART_PATH)).id)).toEqual({ available: true, binary: false, text: CART_JSON });

      // Before its response comes, and while it streams.
      expect(await log.responseBody((await row(EVENTS_PATH, () => true)).id)).toEqual({ available: false, gap: 'stream' });
      const stream = await row(EVENTS_PATH, (r) => r.status === 200);
      expect(stream.mimeType).toBe('text/event-stream');
      const ticks = (await state('window.ticks')) as number;
      expect(await log.responseBody(stream.id)).toEqual({ available: false, gap: 'stream' });
      await waitFor(() => state(`window.ticks > ${ticks + 2}`));
    });
  });

  describe('response overrides', () => {
    it('answer fetch() and XHR with the saved body, status and header changes, and mark the row', async () => {
      await page.goto(url(NETWORK_PATH));
      await row(CART_PATH);
      const hits = site.hits(CART_PATH);
      const override = responseOverride(CART_PATH, '{"items":[],"total":0}', { method: 'GET', operation: '' }, {
        status: 503,
        headers: [{ operation: 'set', name: 'Retry-After', value: '5' }],
      });
      await setOverrides([override]);

      expect(await state(`fetch('${CART_PATH}').then(async (r) => ({ status: r.status, retry: r.headers.get('retry-after'), type: r.headers.get('content-type'), body: await r.json() }))`)).toEqual({
        status: 503,
        retry: '5',
        // The upstream type, with the charset the body is sent in.
        type: 'application/json; charset=utf-8',
        body: { items: [], total: 0 },
      });
      // The response stage: the request itself still reached the server.
      expect(site.hits(CART_PATH)).toBe(hits + 1);
      expect(await state('xhrCart()')).toEqual({ status: 503, body: { items: [], total: 0 } });
      expect(events.filter((e) => e.type === 'override-served' && e.overrideId === override.id)).toHaveLength(2);
      await waitFor(() => rows().filter((r) => r.url.startsWith(url(CART_PATH)) && r.overrideId === override.id).length === 2);
    });

    it('hold the answer back for their delay', async () => {
      await page.goto(url(NETWORK_PATH));
      await setOverrides([responseOverride(CART_PATH, '{"items":[]}', { method: '*', operation: '' }, { delayMs: 600 })]);
      const took = (await state(`(async () => { const t = performance.now(); await (await fetch('${CART_PATH}')).json(); return performance.now() - t; })()`)) as number;
      expect(took).toBeGreaterThanOrEqual(550);
    });

    it('answer only their method, and only the GraphQL operation they name', async () => {
      await page.goto(url(NETWORK_PATH));
      await row(GRAPHQL_PATH);
      await setOverrides([
        responseOverride(GRAPHQL_PATH, '{"data":{"user":{"name":"Grace","id":1}}}', { method: 'POST', operation: 'GetUser' }),
        responseOverride(CART_PATH, '{"items":[]}', { method: 'POST', operation: '' }),
      ]);
      expect(await state(`gql('GetUser').then((r) => r.data.user.name)`)).toBe('Grace');
      expect(await state(`gql('GetCart')`)).toEqual(JSON.parse(GRAPHQL_JSON));
      // A GET isn't answered by an override for POST.
      expect(await state('loadCart()')).toEqual(JSON.parse(CART_JSON));
    });

    it("answer a dedicated worker's fetch", async () => {
      await page.goto(url(NETWORK_PATH));
      await waitFor(() => state('window.workerData'));
      await setOverrides([responseOverride(WORKER_DATA_PATH, '{"source":"override"}', { method: 'GET', operation: '' })]);
      await state('askWorker()');
      await waitFor(() => state(`window.workerData.source === 'override'`));
    });

    it('leave an event stream they pause but don’t answer streaming, and replace one they answer as a whole', async () => {
      // A glob for every /network/ URL pauses the stream at the response stage; PUT only answers none of the page's calls.
      const everything = { ...responseOverride(EVENTS_PATH, '{}', { method: 'PUT', operation: '' }), match: { type: 'glob' as const, pattern: url('/network/*'), ignoreQuery: true } };
      await setOverrides([everything]);
      await page.goto(url(NETWORK_PATH));
      await waitFor(() => state('window.ticks > 3'));
      expect(events.some((e) => e.type === 'override-served')).toBe(false);

      const replaced = responseOverride(EVENTS_PATH, 'data: replaced\n\n', { method: 'GET', operation: '' });
      await setOverrides([replaced]);
      await page.reload();
      await waitFor(() => state(`window.lastEvent === 'replaced'`));
      expect(events.some((e) => e.type === 'override-served' && e.overrideId === replaced.id)).toBe(true);
    });
  });
});
