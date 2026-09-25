/**
 * Network rules against a real Chromium: blocking at the Request stage, header
 * rules through Fetch.continueResponse (subresources) and Fetch.fulfillRequest
 * (HTML documents), and CORS rules, on the page and inside cross-site iframes.
 * Every test checks the unmodified page first. Commands the engine sends are
 * recorded, so the tests also pin how a change was made (a document re-served,
 * a body never read). Where Chromium versions differ (141 here, 152 in
 * Electron 44), only what both do is asserted.
 */
import type { Frame, Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import type { RequestPausedParams } from '../../src/main/engine/InterceptionEngine';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { defaultMatcherFor } from '../../src/shared/matcher';
import {
  DEFAULT_SETTINGS,
  type BlockRule,
  type CorsRule,
  type EngineEvent,
  type HeaderEdit,
  type HeaderRule,
  type Override,
  type Rule,
  type Settings,
  type UrlMatcher,
} from '../../src/shared/types';
import {
  ANALYTICS_JS_PATH,
  API_JSON,
  API_JSON_PATH,
  API_PUT,
  API_PUT_PATH,
  CORS_PATH,
  CSP_PATH,
  FINAL_JS_PATH,
  PLAIN_PATH,
  PLAIN_SCRIPT_PATH,
  REDIRECT_JS_PATH,
  SAME_JSON_CACHE_CONTROL,
  SAME_JSON_PATH,
  TRACK_APP_JS_PATH,
  TRACK_PATH,
  XFO_FRAME_PATH,
  XFO_HOST_PATH,
  XFO_LOADED,
} from '../fixtures/headersPages';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

/** What the engine sends that tests look at. */
const RECORDED_COMMANDS = new Set(['Fetch.continueResponse', 'Fetch.fulfillRequest', 'Fetch.getResponseBody', 'Fetch.failRequest']);

interface Recorded {
  method: string;
  params?: Record<string, any>;
  sessionId?: string;
}

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
const ruleBase = () => {
  const id = (nextId++).toString(16).padStart(8, '0');
  return { id, resourceTypes: [], enabled: true, createdAt: nextId, updatedAt: nextId };
};
const exact = (url: string): UrlMatcher => defaultMatcherFor(url);
const glob = (pattern: string): UrlMatcher => ({ type: 'glob', pattern, ignoreQuery: true });
const blockRule = (match: UrlMatcher): BlockRule => ({ ...ruleBase(), action: 'block', match });
const headerRule = (match: UrlMatcher, headers: HeaderEdit[]): HeaderRule => ({ ...ruleBase(), action: 'headers', match, headers });
const corsRule = (match: UrlMatcher): CorsRule => ({ ...ruleBase(), action: 'cors', match });
const set = (name: string, value: string): HeaderEdit => ({ operation: 'set', name, value });
const remove = (name: string): HeaderEdit => ({ operation: 'remove', name, value: '' });
const header = (headers: Array<{ name: string; value: string }> | undefined, name: string) =>
  headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

describe.skipIf(!chromiumAvailable)('rules in Chromium', () => {
  let site: FixtureSite;
  let chrome: ChromiumHarness;
  let page: Page;
  let transport: CdpTransport;
  let interception: PageInterception;
  let detachTransport: () => Promise<void>;
  let overrides: Override[];
  let rules: Rule[];
  let settings: Settings;
  let events: EngineEvent[];
  let commands: Recorded[];
  let paused: Array<{ params: RequestPausedParams; sessionId?: string }>;

  const url = (path: string) => `${site.url}${path}`;
  const crossSite = (path: string) => `http://localhost:${new URL(site.url).port}${path}`;

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
    rules = [];
    settings = { ...DEFAULT_SETTINGS };
    events = [];
    commands = [];
    paused = [];
    const opened = await chrome.newPage();
    page = opened.page;
    detachTransport = () => opened.transport.detach();
    transport = opened.transport;
    transport.on('Fetch.requestPaused', (params: RequestPausedParams, sessionId) => paused.push({ params, sessionId }));
    const recording: CdpTransport = {
      send: (method, params, sessionId) => {
        if (RECORDED_COMMANDS.has(method)) commands.push({ method, params, sessionId });
        return transport.send(method, params, sessionId);
      },
      on: (event, handler) => transport.on(event, handler),
    };
    interception = new PageInterception({
      transport: recording,
      getOverrides: () => overrides,
      getRules: () => rules,
      getSettings: () => settings,
      emit: (e) => events.push(e),
      fallbackFetch: async (u) => (await fetch(u)).text(),
    });
    await interception.attach();
  });

  afterEach(async () => {
    interception.detach();
    await detachTransport();
    await page.close();
  });

  async function setRules(next: Rule[]): Promise<void> {
    rules = next;
    await interception.refreshInterception();
  }

  /** The commands sent for the pauses of one URL (matched by request id and session). */
  function commandsFor(requestUrl: string, method: string): Recorded[] {
    const ids = new Set(paused.filter((p) => p.params.request.url === requestUrl).map((p) => `${p.sessionId ?? ''}|${p.params.requestId}`));
    return commands.filter((c) => c.method === method && ids.has(`${c.sessionId ?? ''}|${c.params?.requestId}`));
  }

  const applied = (ruleId: string) =>
    events.filter((e): e is Extract<EngineEvent, { type: 'rule-applied' }> => e.type === 'rule-applied' && e.ruleId === ruleId);
  const state = (expr: string) => page.evaluate(expr);
  const trackState = () => state('({ analytics: window.analyticsRan === true, analyticsBlocked: window.analyticsBlocked === true, app: window.trackAppRan === true })');
  /** Adds a script to the page: 'load' or 'error'. */
  const loadScript = (src: string) =>
    state(`new Promise((resolve) => {
      const el = document.createElement('script');
      el.src = ${JSON.stringify(src)};
      el.onload = () => resolve('load');
      el.onerror = () => resolve('error');
      document.head.append(el);
    })`);

  describe('blocking', () => {
    it('fails a script before it is sent, lists it as blocked, and the rest of the page runs', async () => {
      await page.goto(url(TRACK_PATH));
      expect(await trackState()).toEqual({ analytics: true, analyticsBlocked: false, app: true });

      const rule = blockRule(exact(url(ANALYTICS_JS_PATH)));
      await setRules([rule]);
      const hits = site.hits(ANALYTICS_JS_PATH);
      await page.reload();
      expect(await trackState()).toEqual({ analytics: false, analyticsBlocked: true, app: true });
      expect(site.hits(ANALYTICS_JS_PATH)).toBe(hits);
      expect(applied(rule.id)).toEqual([{ type: 'rule-applied', ruleId: rule.id, url: url(ANALYTICS_JS_PATH) }]);
      expect(interception.listResources().find((r) => r.url === url(ANALYTICS_JS_PATH))).toEqual({
        url: url(ANALYTICS_JS_PATH),
        kind: 'Script',
        mimeType: '',
        status: 0,
        blockedBy: rule.id,
      });
      // The blocked file can still be opened: read outside the page.
      expect((await interception.getResourceContent(url(ANALYTICS_JS_PATH))).content).toContain('analyticsRan');
    });

    it('blocks a URL that is also overridden: the override is never served', async () => {
      await page.goto(url(TRACK_PATH));
      expect(await trackState()).toMatchObject({ analytics: true });

      overrides = [
        { id: 'o1', kind: 'Script', sourceUrl: url(ANALYTICS_JS_PATH), match: exact(url(ANALYTICS_JS_PATH)), enabled: true, originalHash: null, createdAt: 0, updatedAt: 0, content: "window.analyticsRan = 'override';" },
      ];
      await setRules([blockRule(exact(url(ANALYTICS_JS_PATH)))]);
      await page.reload();
      expect(await trackState()).toEqual({ analytics: false, analyticsBlocked: true, app: true });
      expect(await state('window.analyticsRan')).toBeUndefined();
      expect(events.some((e) => e.type === 'override-served')).toBe(false);
    });

    it("never blocks the page's own document, even when a rule matches it", async () => {
      await page.goto(url(TRACK_PATH));
      expect(await trackState()).toMatchObject({ analytics: true, app: true });

      const rule = blockRule(glob(`${site.url}/headers/*`));
      await setRules([rule]);
      await page.reload();
      expect(await page.title()).toBe('Tracking fixture');
      expect(await trackState()).toEqual({ analytics: false, analyticsBlocked: true, app: false });
      expect(applied(rule.id).map((e) => e.url).sort()).toEqual([url(ANALYTICS_JS_PATH), url(TRACK_APP_JS_PATH)].sort());

      // Pins what keeps the page safe: its Request-stage pause names the main frame.
      const { frameTree } = await transport.send<{ frameTree: { frame: { id: string } } }>('Page.getFrameTree');
      const documentPause = paused.find((p) => p.params.request.url === url(TRACK_PATH) && p.params.responseStatusCode === undefined);
      expect(documentPause?.params.resourceType).toBe('Document');
      expect(documentPause?.params.frameId).toBe(frameTree.frame.id);
      expect(commandsFor(url(TRACK_PATH), 'Fetch.failRequest')).toEqual([]);
    });

    it("blocks a script inside a cross-site iframe, on the iframe's own session", async () => {
      const openFrames = async () => {
        await page.goto(url('/frames.html'));
        await waitFor(() => interception.targets().length === 2);
      };
      const widget = (): Promise<Frame> => waitFor(() => page.frames().find((f) => f.url() === crossSite('/frames/widget.html')));
      await openFrames();
      await waitFor(async () => (await (await widget()).evaluate('window.widgetLazyValue')) === 'original-widget-lazy');

      const lazy = crossSite('/frames/widget-lazy.js');
      const rule = blockRule(exact(lazy));
      await setRules([rule]);
      await openFrames();
      await waitFor(() => applied(rule.id).length > 0);
      const frame = await widget();
      await waitFor(async () => (await frame.evaluate('window.widgetValue')) === 'original-widget');
      expect(await frame.evaluate('window.widgetLazyValue')).toBeUndefined();
      const failed = commandsFor(lazy, 'Fetch.failRequest');
      expect(failed).toHaveLength(1);
      expect(failed[0].sessionId).toBeTruthy();
    });

    it("blocks a cross-site iframe's document: the frame shows an error and the page keeps running", async () => {
      await page.goto(url('/frames.html'));
      await waitFor(() => interception.targets().length === 2);

      const widgetDoc = crossSite('/frames/widget.html');
      const rule = blockRule(exact(widgetDoc));
      await setRules([rule]);
      await page.goto(url('/frames.html'));
      await waitFor(() => page.frames().some((f) => f.url().startsWith('chrome-error://')));
      expect(page.frames().some((f) => f.url() === widgetDoc)).toBe(false);
      expect(await state('window.sharedValue')).toBe('original-shared');
      expect(commandsFor(widgetDoc, 'Fetch.failRequest').map((c) => c.sessionId)).toEqual([undefined]);
      expect(interception.listResources().find((r) => r.url === widgetDoc)).toMatchObject({ kind: 'Document', blockedBy: rule.id, frame: { depth: 1 } });
    });

    it("blocks a redirect's later hop, though the earlier one reached the server", async () => {
      await page.goto(url(TRACK_PATH));
      expect(await loadScript(REDIRECT_JS_PATH)).toBe('load');
      expect(await state('window.finalRan')).toBe(true);

      await setRules([blockRule(exact(url(FINAL_JS_PATH)))]);
      await page.reload();
      const [redirects, finals] = [site.hits(REDIRECT_JS_PATH), site.hits(FINAL_JS_PATH)];
      expect(await loadScript(REDIRECT_JS_PATH)).toBe('error');
      expect(await state('window.finalRan')).toBeUndefined();
      expect(site.hits(REDIRECT_JS_PATH)).toBe(redirects + 1);
      expect(site.hits(FINAL_JS_PATH)).toBe(finals);
    });

    it('lets the page have the file again once the rule is turned off', async () => {
      await page.goto(url(TRACK_PATH));
      expect(await trackState()).toMatchObject({ analytics: true });
      const rule = blockRule(exact(url(ANALYTICS_JS_PATH)));
      await setRules([rule]);
      await page.reload();
      expect(await trackState()).toMatchObject({ analytics: false, analyticsBlocked: true });

      await setRules([{ ...rule, enabled: false }]);
      await page.reload();
      expect(await trackState()).toEqual({ analytics: true, analyticsBlocked: false, app: true });
    });
  });

  describe('response headers', () => {
    const cspState = () => state('({ inline: window.inlineRan === true, ext: window.extRan === true })');

    it("removes a gzipped document's CSP by re-serving it, without its framing headers", async () => {
      await page.goto(url(CSP_PATH));
      expect(await cspState()).toEqual({ inline: false, ext: true });

      const rule = headerRule(exact(url(CSP_PATH)), [remove('Content-Security-Policy')]);
      await setRules([rule]);
      await page.reload();
      expect(await cspState()).toEqual({ inline: true, ext: true });
      const [fulfil] = commandsFor(url(CSP_PATH), 'Fetch.fulfillRequest');
      expect(fulfil).toBeDefined();
      expect(fulfil.params?.responseCode).toBe(200);
      for (const name of ['Content-Security-Policy', 'Content-Encoding', 'Content-Length']) expect(header(fulfil.params?.responseHeaders, name)).toBeUndefined();
      expect(commandsFor(url(CSP_PATH), 'Fetch.continueResponse')).toEqual([]);
      expect(applied(rule.id)).toHaveLength(1);
    });

    it("adds a CSP to a document, which then refuses its inline script", async () => {
      await page.goto(url(PLAIN_PATH));
      expect(await state('window.inlineRan')).toBe(true);

      await setRules([headerRule(exact(url(PLAIN_PATH)), [set('Content-Security-Policy', "script-src 'self'")])]);
      await page.reload();
      expect(await page.title()).toBe('Plain fixture');
      expect(await state('window.inlineRan')).toBeUndefined();
    });

    it("lets a page frame a cross-site page that refuses it, by removing X-Frame-Options on the parent's session", async () => {
      await page.goto(url(XFO_HOST_PATH));
      expect(await state('window.msgs')).toEqual([]);

      const frameUrl = crossSite(XFO_FRAME_PATH);
      await setRules([headerRule(exact(frameUrl), [remove('X-Frame-Options')])]);
      await page.reload();
      await waitFor(async () => ((await state('window.msgs')) as string[]).includes(XFO_LOADED));
      const fulfils = commandsFor(frameUrl, 'Fetch.fulfillRequest');
      expect(fulfils.map((c) => c.sessionId)).toEqual([undefined]);
    });

    it('never reads or re-serves a document a rule leaves unchanged', async () => {
      await page.goto(url(PLAIN_PATH));
      expect(await state('window.inlineRan')).toBe(true);

      const rule = headerRule(exact(url(PLAIN_PATH)), [remove('X-Not-Sent')]);
      await setRules([rule]);
      await page.reload();
      expect(await state('window.inlineRan')).toBe(true);
      expect(paused.some((p) => p.params.request.url === url(PLAIN_PATH))).toBe(true);
      expect(commandsFor(url(PLAIN_PATH), 'Fetch.getResponseBody')).toEqual([]);
      expect(commandsFor(url(PLAIN_PATH), 'Fetch.fulfillRequest')).toEqual([]);
      expect(applied(rule.id)).toEqual([]);
    });

    it('shows the page a rewritten Cache-Control', async () => {
      await page.goto(url(TRACK_PATH));
      const cacheControl = () => state(`fetch('${SAME_JSON_PATH}').then((r) => r.headers.get('cache-control'))`);
      expect(await cacheControl()).toBe(SAME_JSON_CACHE_CONTROL);

      await setRules([headerRule(exact(url(SAME_JSON_PATH)), [set('Cache-Control', 'no-store')])]);
      expect(await cacheControl()).toBe('no-store');
      expect(commandsFor(url(SAME_JSON_PATH), 'Fetch.continueResponse')).toHaveLength(1);
    });

    it("runs a script served as text/plain with nosniff once a rule fixes its Content-Type", async () => {
      await page.goto(url(PLAIN_PATH));
      expect(await state('({ ran: window.plainScriptRan === true, failed: window.plainScriptFailed === true })')).toEqual({ ran: false, failed: true });

      await setRules([headerRule(exact(url(PLAIN_SCRIPT_PATH)), [set('Content-Type', 'text/javascript')])]);
      await page.reload();
      expect(await state('({ ran: window.plainScriptRan === true, failed: window.plainScriptFailed === true })')).toEqual({ ran: true, failed: false });
    });

    it('restores the original headers once the rule is turned off', async () => {
      await page.goto(url(CSP_PATH));
      expect(await cspState()).toEqual({ inline: false, ext: true });
      const rule = headerRule(exact(url(CSP_PATH)), [remove('Content-Security-Policy')]);
      await setRules([rule]);
      await page.reload();
      expect(await cspState()).toEqual({ inline: true, ext: true });

      await setRules([{ ...rule, enabled: false }]);
      await page.reload();
      expect(await cspState()).toEqual({ inline: false, ext: true });
    });
  });

  describe('CORS', () => {
    const apiRule = () => corsRule(glob(crossSite('/headers/*')));

    it('lets the page read a cross-site API with credentials, allowing exactly its origin', async () => {
      await page.goto(url(CORS_PATH));
      await waitFor(async () => (await page.textContent('#api')) !== 'loading');
      expect(await page.textContent('#api')).toBe('error: Failed to fetch');

      const rule = apiRule();
      await setRules([rule]);
      expect(await state('callApi()')).toBe(API_JSON);
      expect(await page.textContent('#api')).toBe(API_JSON);

      const api = crossSite(API_JSON_PATH);
      const [continued] = commandsFor(api, 'Fetch.continueResponse');
      expect(header(continued.params?.responseHeaders, 'Access-Control-Allow-Origin')).toBe(site.url);
      expect(header(continued.params?.responseHeaders, 'Access-Control-Allow-Credentials')).toBe('true');
      expect(header(continued.params?.responseHeaders, 'Access-Control-Expose-Headers')).toContain('x-api');
      // Which way the origin was found (the request's Origin header, or its frame's URL) differs by build; the result must not.
      const pause = paused.find((p) => p.params.request.url === api && p.params.responseStatusCode !== undefined);
      const originHeader = Object.entries(pause?.params.request.headers ?? {}).find(([name]) => name.toLowerCase() === 'origin')?.[1];
      expect(originHeader === undefined || originHeader === site.url).toBe(true);
      expect(applied(rule.id).length).toBeGreaterThan(0);
    });

    it('answers a preflight the API refuses (405), so the PUT goes through', async () => {
      await page.goto(url(CORS_PATH));
      expect(await state('putApi()')).toBe('error: Failed to fetch');
      expect(site.hits(API_PUT_PATH, 'OPTIONS')).toBeGreaterThan(0);
      expect(site.hits(API_PUT_PATH, 'PUT')).toBe(0);

      await setRules([apiRule()]);
      expect(await state('putApi()')).toBe(API_PUT);
      expect(site.hits(API_PUT_PATH, 'PUT')).toBe(1);
      const preflight = commandsFor(crossSite(API_PUT_PATH), 'Fetch.continueResponse').find((c) => c.params?.responseCode === 204);
      expect(header(preflight?.params?.responseHeaders, 'Access-Control-Allow-Methods')).toBe('PUT');
      expect(header(preflight?.params?.responseHeaders, 'Access-Control-Allow-Headers')?.toLowerCase()).toContain('x-custom');
    });

    it('needs every hop of a cross-origin redirect to match', async () => {
      await page.goto(url(CORS_PATH));
      expect(await state('redirectApi()')).toBe('error: Failed to fetch');

      await setRules([corsRule(exact(crossSite(API_JSON_PATH)))]);
      expect(await state('redirectApi()')).toBe('error: Failed to fetch');

      await setRules([apiRule()]);
      expect(await state('redirectApi()')).toBe(API_JSON);
    });
  });
});
