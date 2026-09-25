/**
 * Phase 2 of the Network panel against a real Chromium (docs/NETWORK_PANEL.md): response overrides
 * that don't send the request (answered before it goes out, CORS and preflight included, the server
 * never hit), and breakpoints that hold a request before it is sent or at its response until it is
 * let go as edited, as it was, or failed, and let go of when the page gives up on it.
 */
import type { Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { NetworkLog } from '../../src/main/network';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type Breakpoint, type BreakpointStage, type HeldRequest, type Override } from '../../src/shared/types';
import { CART_JSON, CART_PATH, GRAPHQL_PATH, NETWORK_PATH, ORDERS_PATH } from '../fixtures/networkPages';
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

type Settled = { status?: number; body?: string; error?: string };

describe.skipIf(!chromiumAvailable)('held and unsent requests in Chromium', () => {
  let site: FixtureSite;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let log: NetworkLog;
  let detachTransport: () => Promise<void>;
  let overrides: Override[];
  let breakpoints: Breakpoint[];

  const url = (path: string) => `${site.url}${path}`;
  /** The fixture site on another origin (`localhost` for `127.0.0.1`): the same server, cross-site to the page. */
  const otherOrigin = () => site.url.replace('127.0.0.1', 'localhost');
  const call = (expr: string) => page.evaluate(expr) as Promise<Settled>;
  const heldNow = () => waitFor(() => log.held.list()[0]);

  async function setBreakpoints(path: string, stage: BreakpointStage, method = '*'): Promise<void> {
    breakpoints = [{ id: 'bp-1', match: defaultMatcherFor(url(path)), method, stage, enabled: true }];
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
    breakpoints = [];
    const opened = await chrome.newPage();
    page = opened.page;
    detachTransport = () => opened.transport.detach();
    log = new NetworkLog({ transport: opened.transport, send: () => {} });
    interception = new PageInterception({
      transport: opened.transport,
      getOverrides: () => overrides,
      getRules: () => [],
      getSettings: () => ({ ...DEFAULT_SETTINGS }),
      getBreakpoints: () => breakpoints,
      hold: (request, owner) => log.held.hold(request, owner),
      releaseHeld: (owner) => log.held.releaseOwner(owner),
      emit: (e) => log.engineEvent(e),
      fallbackFetch: async (u) => (await fetch(u)).text(),
    });
    await interception.attach();
    await page.goto(url(NETWORK_PATH));
    await waitFor(() => page.evaluate('window.cart && window.user'));
  });

  afterEach(async () => {
    interception.detach();
    log.dispose();
    await detachTransport();
    await page.close();
  });

  describe('a response override that does not send', () => {
    it("answers another origin's POST and its preflight itself: the server never sees either", async () => {
      const orders = `${otherOrigin()}${ORDERS_PATH}`;
      overrides = [
        {
          id: 'o1',
          kind: 'Fetch',
          sourceUrl: orders,
          match: defaultMatcherFor(orders),
          enabled: true,
          originalHash: null,
          request: { method: 'POST', operation: '' },
          response: { status: 201, delayMs: 0, headers: [], send: false },
          createdAt: 0,
          updatedAt: 0,
          content: '{"id":42,"state":"mocked"}',
        },
      ];
      await interception.refreshInterception();

      expect(await call(`placeOrder(${JSON.stringify(otherOrigin())})`)).toEqual({ status: 201, body: '{"id":42,"state":"mocked"}' });
      expect(site.hits(ORDERS_PATH, 'POST')).toBe(0);
      expect(site.hits(ORDERS_PATH, 'OPTIONS')).toBe(0);
      expect(await waitFor(() => log.list().find((r) => r.url === orders && r.method === 'POST' && r.overrideId))).toMatchObject({ overrideId: 'o1', status: 201 });
    });

    it('without it, the server turns the preflight away and the page gets nothing', async () => {
      expect(await call(`placeOrder(${JSON.stringify(otherOrigin())})`)).toEqual({ error: 'TypeError' });
      expect(site.hits(ORDERS_PATH, 'OPTIONS')).toBe(1);
      expect(site.hits(ORDERS_PATH, 'POST')).toBe(0);
    });
  });

  describe('a breakpoint', () => {
    it('holds a response until it is let go with an edited status, headers and body; its row is marked meanwhile', async () => {
      await setBreakpoints(CART_PATH, 'response');
      const result = call('tryCart()');
      const held: HeldRequest = await heldNow();
      expect(held).toMatchObject({ stage: 'response', method: 'GET', url: url(CART_PATH), response: { status: 200, body: CART_JSON } });
      expect(await waitFor(() => log.list().find((r) => r.heldId === held.id))).toMatchObject({ url: url(CART_PATH), state: 'pending' });

      log.held.resume(held.id, { type: 'respond', status: 418, headers: [{ operation: 'set', name: 'X-Edited', value: 'yes' }], body: '{"items":[]}' });
      expect(await result).toEqual({ status: 418, body: '{"items":[]}' });
      expect(log.held.list()).toEqual([]);
      expect(await waitFor(() => log.list().find((r) => r.url === url(CART_PATH) && r.status === 418))).not.toHaveProperty('heldId');
    });

    it('lets a held response go as it was', async () => {
      await setBreakpoints(CART_PATH, 'response');
      const result = call('tryCart()');
      log.held.resume((await heldNow()).id, { type: 'continue' });
      expect(await result).toEqual({ status: 200, body: CART_JSON });
    });

    it('holds a request before it is sent, then sends it where and how it was edited', async () => {
      await setBreakpoints(GRAPHQL_PATH, 'request', 'POST');
      const before = site.hits(GRAPHQL_PATH, 'POST');
      const result = call("tryGql('GetUser')");
      const held = await heldNow();
      expect(held).toMatchObject({ stage: 'request', method: 'POST', requestBody: '{"operationName":"GetUser"}' });
      expect(held.response).toBeUndefined();
      expect(site.hits(GRAPHQL_PATH, 'POST')).toBe(before);
      expect(await waitFor(() => log.list().find((r) => r.heldId === held.id))).toMatchObject({ url: url(GRAPHQL_PATH), method: 'POST', state: 'pending' });

      log.held.resume(held.id, { type: 'send', url: url(CART_PATH), method: 'POST', headers: [{ operation: 'set', name: 'X-Edited', value: 'yes' }], body: '{}' });
      expect(await result).toEqual({ status: 200, body: CART_JSON });
      expect(site.hits(GRAPHQL_PATH, 'POST')).toBe(before);
      expect(site.hits(CART_PATH, 'POST')).toBe(1);
    });

    it('answers a request before it is sent, and the server never sees it', async () => {
      await setBreakpoints(GRAPHQL_PATH, 'request', 'POST');
      const before = site.hits(GRAPHQL_PATH, 'POST');
      const result = call("tryGql('GetUser')");
      log.held.resume((await heldNow()).id, { type: 'respond', status: 200, headers: [], body: '{"data":null}' });
      expect(await result).toEqual({ status: 200, body: '{"data":null}' });
      expect(site.hits(GRAPHQL_PATH, 'POST')).toBe(before);
    });

    it('fails a held request with the network error picked', async () => {
      await setBreakpoints(CART_PATH, 'request');
      const result = call('tryCart()');
      log.held.resume((await heldNow()).id, { type: 'fail', reason: 'ConnectionRefused' });
      expect(await result).toEqual({ error: 'TypeError' });
    });

    it('lets go of a request the page gave up on; it can no longer be resumed', async () => {
      await setBreakpoints(CART_PATH, 'response');
      const result = call('tryCart(500)');
      const held = await heldNow();
      expect(await result).toEqual({ error: 'TimeoutError' });
      await waitFor(() => log.held.list().length === 0);
      expect(() => log.held.resume(held.id, { type: 'continue' })).toThrow(/no longer held/);
    });

    it('lets go of everything it holds when interception stops', async () => {
      await setBreakpoints(CART_PATH, 'response');
      void call('tryCart()');
      await heldNow();
      interception.detach();
      expect(log.held.list()).toEqual([]);
    });

    it('stops nothing once it is off', async () => {
      await setBreakpoints(CART_PATH, 'response');
      breakpoints = [{ ...breakpoints[0]!, enabled: false }];
      await interception.refreshInterception();
      expect(await call('tryCart()')).toEqual({ status: 200, body: CART_JSON });
      expect(log.held.list()).toEqual([]);
    });
  });
});
