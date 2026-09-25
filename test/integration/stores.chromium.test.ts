/**
 * The store timeline against real Chromium: carts whose state lives in Redux
 * Toolkit, Zustand (its devtools middleware), Pinia and Vuex, and NgRx (with its
 * StoreDevtools), bundled by the test from the repo's own packages as production
 * builds. Each store is heard through the stand-in of the framework hooks while
 * store actions are recorded: what each action changed, and the stack that
 * dispatched it, traced to the fixture's line through the source map. A React
 * commit right after an action names it; a request keeps the script that sent it.
 */
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import type { Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { NetworkLog } from '../../src/main/network';
import { ACTION_SETTLE_MS } from '../../src/main/inspector/stores/constants';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type RenderCommit, type StackFrame, type StoreAction } from '../../src/shared/types';
import { bundleApp } from '../helpers/bundleApp';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

const APPS = join(__dirname, '../fixtures/apps');
/** The 1-based line a fixture app declares something on. */
const lineOf = (file: string, text: string) => readFileSync(join(APPS, file), 'utf8').split('\n').findIndex((line) => line.includes(text)) + 1;

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 15_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe.skipIf(!chromiumAvailable)('store timelines in Chromium', () => {
  let server: Server;
  let origin: string;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let services: FrameServices;
  let transport: Awaited<ReturnType<ChromiumHarness['newPage']>>['transport'];
  let events: AppEvent[];
  const maps = new Map<string, TraceMap>();

  beforeAll(async () => {
    const routes = new Map<string, [string, string]>([['/api/checkout', ['application/json', '{}']]]);
    const builds = [
      ['redux', 'reduxCart.ts', '<div id="root"></div>'],
      ['zustand', 'zustandCart.ts', '<div id="root"></div>'],
      ['pinia', 'piniaCart.ts', '<div id="root"></div>'],
      ['ngrx', 'ngrxCart.ts', '<app-root></app-root>'],
    ] as const;
    for (const [name, entry, body] of builds) {
      const app = await bundleApp(entry, name, 'production');
      routes.set(`/${name}.js`, ['text/javascript', app.code]);
      routes.set(`/${name}.html`, ['text/html', `<!doctype html><title>${name}</title>${body}<script src="/${name}.js"></script>`]);
      routes.set(`/${name}.js.map`, ['application/json', app.map!]);
      maps.set(`/${name}.js`, new TraceMap(app.map!));
    }
    server = createServer((req, res) => {
      const route = routes.get(new URL(req.url ?? '/', 'http://x').pathname);
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': `${route[0]}; charset=utf-8` }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    chrome = await launchChromium();
  });

  afterAll(async () => {
    await chrome?.close();
    await new Promise((r) => server?.close(r));
  });

  afterEach(async () => {
    interception.detach();
    await transport.detach();
    await page.close();
  });

  /** Opens a fixture with store actions recorded (from before it loads, or once it has). */
  async function open(name: string, recordFirst = false): Promise<void> {
    events = [];
    const opened = await chrome.newPage();
    page = opened.page;
    transport = opened.transport;
    services = new FrameServices(() => DEFAULT_SETTINGS, (e) => events.push(e));
    interception = new PageInterception({ transport, getOverrides: () => [], getRules: () => [], getSettings: () => DEFAULT_SETTINGS, emit: () => undefined, sessions: services });
    await interception.attach();
    if (recordFirst) await services.inspector.recordStores(true);
    await page.goto(`${origin}/${name}.html`);
    await page.locator('button').first().waitFor();
    if (!recordFirst) await services.inspector.recordStores(true);
  }

  const actions = () => events.flatMap((e) => (e.type === 'stores-recorded' ? e.actions : []));
  const nextAction = (count: number) => waitFor(() => (actions().length >= count ? actions()[count - 1] : undefined));
  /** Where a call of the stack comes from, through the bundle's source map. */
  const original = (frame: StackFrame) => {
    const map = maps.get(new URL(frame.url).pathname);
    return map ? originalPositionFor(map, { line: frame.line + 1, column: frame.column }) : null;
  };
  /** The lines of the fixture's own file the stack passes through. */
  const appLines = (action: StoreAction, file: string) => action.stack.map(original).filter((p) => p?.source?.endsWith(file)).map((p) => p!.line);

  it("hears Redux Toolkit's actions: the slice's type, its payload, what changed, and the handler that dispatched it", async () => {
    await open('redux');
    await page.locator('#add-A1').click();
    const action = await nextAction(1);
    expect(action).toMatchObject({ store: 'Redux', library: 'redux', type: 'cart/added', payload: '"A1"' });
    expect(action.changes).toEqual([
      { path: 'cart.count', from: '0', to: '1' },
      { path: 'cart.skus', from: '(0) []', to: '(1) ["A1"]' },
    ]);
    expect(action.duration).toEqual(expect.any(Number));
    expect(appLines(action, 'reduxCart.ts')).toContain(lineOf('reduxCart.ts', 'dispatch(cart.actions.added(sku))'));
    expect(action.frameId).toEqual(expect.any(String));
    // The page stack names Redux: its store was created through the stand-in.
    await services.inspector.scan();
    expect(services.inspector.list()[0]!.hits).toContainEqual({ id: 'redux', signal: 'standIn', version: null, build: null });
  });

  it('keeps the stack of the script that sent a request, traced to the handler that sent it', async () => {
    await open('redux');
    const log = new NetworkLog({ transport, send: () => undefined });
    await page.locator('#checkout').click();
    const request = await waitFor(() => log.list().find((r) => r.url.endsWith('/api/checkout')));
    expect(request.initiator?.map(original).find((p) => p?.source?.endsWith('reduxCart.ts'))?.line).toBe(lineOf('reduxCart.ts', "void fetch('/api/checkout'"));
  });

  it('names the action in the React commit it led to, and records nothing once stopped', async () => {
    await open('redux');
    await services.inspector.recordRenders(true);
    await page.locator('#add-A1').click();
    const commit = await waitFor(() => events.flatMap((e) => (e.type === 'renders-recorded' ? e.commits : [])).find((c: RenderCommit) => c.action));
    expect(commit.action).toEqual({ store: 'Redux', type: 'cart/added' });
    await services.inspector.recordStores(false);
    const before = actions().length;
    await page.locator('#add-A1').click();
    await expect.poll(() => page.locator('#count').textContent()).toBe('2 items');
    await new Promise((r) => setTimeout(r, 300));
    expect(actions()).toHaveLength(before);
  });

  it("hears a Zustand store through its devtools middleware: the action's name and what changed", async () => {
    await open('zustand');
    await page.locator('#add-A1').click();
    const action = await nextAction(1);
    expect(action).toMatchObject({ store: 'cart', library: 'devtools', type: 'cart/add', payload: null, duration: null });
    expect(action.changes).toEqual([
      { path: 'count', from: '0', to: '1' },
      { path: 'last', from: 'null', to: '"A1"' },
    ]);
    expect(appLines(action, 'zustandCart.ts')).toContain(lineOf('zustandCart.ts', 'add(sku);'));
  });

  it("hears Pinia's actions and direct changes, and Vuex's mutations, once recording finds the app's stores", async () => {
    await open('pinia');
    await page.locator('#add-A1').click();
    const added = await nextAction(1);
    expect(added).toMatchObject({ store: 'cart', library: 'pinia', type: 'add', payload: '"A1"' });
    expect(added.changes).toEqual([
      { path: 'count', from: '0', to: '1' },
      { path: 'skus', from: '(0) []', to: '(1) ["A1"]' },
    ]);
    expect(appLines(added, 'piniaCart.ts')).toContain(lineOf('piniaCart.ts', 'cart.add(props.sku)'));

    await page.locator('#reset').click();
    const reset = await nextAction(2);
    expect(reset).toMatchObject({ store: 'cart', library: 'pinia', type: 'direct', changes: [{ path: 'count', from: '1', to: '0' }] });
    expect(appLines(reset, 'piniaCart.ts')).toContain(lineOf('piniaCart.ts', 'cart.count = 0'));

    await page.locator('#usd').click();
    const currency = await nextAction(3);
    expect(currency).toMatchObject({ store: 'Vuex', library: 'vuex', type: 'setCurrency', payload: '"USD"', changes: [{ path: 'currency', from: '"EUR"', to: '"USD"' }] });
  });

  it("hears Pinia's direct changes again once an action that never settles stops counting as running", async () => {
    await open('pinia');
    await page.locator('#hang').click();
    await page.locator('#add-A1').click();
    await nextAction(1);
    // Past ACTION_SETTLE_MS, as the stand-in tells time.
    await page.evaluate((skew) => {
      const now = performance.now.bind(performance);
      performance.now = () => now() + skew;
    }, ACTION_SETTLE_MS + 1000);
    await page.locator('#reset').click();
    expect(await nextAction(2)).toMatchObject({ store: 'cart', type: 'direct', changes: [{ path: 'count', from: '1', to: '0' }] });
  });

  it("finds a Vue app's stores itself when the document loads while recording", async () => {
    await open('pinia', true);
    await page.locator('#add-A1').click();
    expect(await nextAction(1)).toMatchObject({ store: 'cart', type: 'add' });
  });

  it("hears NgRx's actions through its StoreDevtools", async () => {
    await open('ngrx');
    await page.locator('#add-A1').click();
    await page.locator('#add-A1').click();
    const action = await nextAction(2);
    expect(action).toMatchObject({ store: 'NgRx Store DevTools', library: 'devtools', type: '[Cart] Add', payload: '{sku: "A1"}' });
    expect(action.changes).toEqual([{ path: 'cart.count', from: '1', to: '2' }]);
    expect(appLines(action, 'ngrxCart.ts')).toContain(lineOf('ngrxCart.ts', 'this.store.dispatch'));
  });
});
