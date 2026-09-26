/**
 * "Save as action" for setting state, against real Chromium: a component is
 * picked in carts in React, Vue 3, Vue 2, Angular (development) and Lit (inside
 * shadow roots), the action for a value is written, the page is loaded again,
 * and the action's code, run in the page as an action runs, sets the value. An
 * Angular production build gets no action: the page has no way to its components.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Locator, Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { stateAction } from '../../src/shared/stateAction';
import { DEFAULT_SETTINGS, type AppEvent, type InspectedComponent, type StateEdit } from '../../src/shared/types';
import { bundleApp } from '../helpers/bundleApp';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 15_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe.skipIf(!chromiumAvailable)('state set by a saved action, in Chromium', () => {
  let server: Server;
  let origin: string;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let services: FrameServices;
  let transport: Awaited<ReturnType<ChromiumHarness['newPage']>>['transport'];
  let events: AppEvent[];

  beforeAll(async () => {
    const routes = new Map<string, [string, string]>();
    const builds = [
      ['react', 'reactCart.ts', 'production', '<div id="root"></div>'],
      ['vue', 'vueCart.ts', 'production', '<div id="root"></div>'],
      ['vue-dev', 'vueCart.ts', 'development', '<div id="root"></div>'],
      ['vue2', 'vue2Cart.ts', 'production', '<div id="root"></div>'],
      ['angular', 'angularCart.ts', 'production', '<app-root></app-root>'],
      ['angular-dev', 'angularCart.ts', 'development', '<app-root></app-root>'],
      ['lit', 'litCart.ts', 'production', '<div id="root"></div>'],
    ] as const;
    for (const [name, entry, mode, body] of builds) {
      const app = await bundleApp(entry, name, mode);
      routes.set(`/${name}.js`, ['text/javascript', app.code]);
      routes.set(`/${name}.html`, ['text/html', `<!doctype html><title>${name}</title>${body}<script src="/${name}.js"></script>`]);
      if (app.map) routes.set(`/${name}.js.map`, ['application/json', app.map]);
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

  async function open(name: string): Promise<void> {
    events = [];
    const opened = await chrome.newPage();
    page = opened.page;
    transport = opened.transport;
    services = new FrameServices(() => DEFAULT_SETTINGS, (e) => events.push(e));
    interception = new PageInterception({ transport, getOverrides: () => [], getRules: () => [], getSettings: () => DEFAULT_SETTINGS, emit: () => undefined, sessions: services });
    await interception.attach();
    await page.goto(`${origin}/${name}.html`);
  }

  /** Picks `target` with the pointer, and reads the component `depth` up its chain. */
  async function pick(target: Locator, depth = 0): Promise<InspectedComponent> {
    await target.waitFor();
    await services.inspector.startPicking();
    const box = (await target.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const picked = (await waitFor(() => events.find((e) => e.type === 'inspect-picked'))) as Extract<AppEvent, { type: 'inspect-picked' }>;
    return depth ? services.inspector.inspectComponent(picked.component.pickId, depth) : picked.component;
  }

  /** Loads the page again, and runs the action's code in it as an action runs; its error, if it threw. */
  async function runAfterReload(code: string, ready: Locator): Promise<string | undefined> {
    await page.reload();
    await ready.waitFor();
    return run(code);
  }
  async function run(code: string): Promise<string | undefined> {
    const reply = await transport.send<{ exceptionDetails?: { exception?: { description?: string } } }>('Runtime.evaluate', { expression: `(() => {\n${code}\n})()`, returnByValue: true });
    return reply.exceptionDetails?.exception?.description;
  }

  const actionFor = (component: InspectedComponent, edit: StateEdit, label: string) => {
    const action = stateAction(component, edit, label);
    expect(action).not.toBeNull();
    return action!;
  };

  it("sets a React function component's useState hook, found from its element's fiber", async () => {
    await open('react');
    const component = await pick(page.locator('#add-A1'));
    expect(component.selector).toEqual(['#add-A1']);
    const action = actionFor(component, { kind: 'state', name: '1', json: '5' }, 'qty');
    expect(action.name).toBe(`Set qty of ${component.chain[0]!.name} to 5`);
    expect(await runAfterReload(action.code, page.locator('#add-A1'))).toBeUndefined();
    await expect.poll(() => page.locator('.cart-item').first().textContent()).toContain('50 EUR');
  });

  it("sets a production Vue 3 component's ref and data, up the chain from the element", async () => {
    await open('vue');
    const list = await pick(page.locator('#add-A1'), 1);
    const ref = actionFor(list, { kind: 'setup', name: 'open', json: 'false' }, 'open');
    const data = actionFor(list, { kind: 'data', name: 'title', json: '"Big cart"' }, 'title');
    expect(await runAfterReload(ref.code, page.locator('#add-A1'))).toBeUndefined();
    expect(await run(data.code)).toBeUndefined();
    await expect.poll(() => page.locator('#list').getAttribute('data-open')).toBe('false');
    expect(await page.locator('#list').getAttribute('data-title')).toBe('Big cart');
  });

  it("sets a development Vue 3 component's state, found through the element's own tag", async () => {
    await open('vue-dev');
    const list = await pick(page.locator('#add-B2'), 1);
    const action = actionFor(list, { kind: 'setup', name: 'open', json: 'false' }, 'open');
    expect(await runAfterReload(action.code, page.locator('#add-B2'))).toBeUndefined();
    await expect.poll(() => page.locator('#list').getAttribute('data-open')).toBe('false');
  });

  it("sets a Vue 2 component's data", async () => {
    await open('vue2');
    const component = await pick(page.locator('#add-A1'));
    const action = actionFor(component, { kind: 'data', name: 'qty', json: '4' }, 'qty');
    expect(await runAfterReload(action.code, page.locator('#add-A1'))).toBeUndefined();
    await expect.poll(() => page.locator('.cart-item').first().textContent()).toContain('40');
  });

  it("sets an Angular development build's signal through ng; a production build gets no action", async () => {
    await open('angular-dev');
    const component = await pick(page.locator('#add-A1'));
    const action = actionFor(component, { kind: 'signal', name: 'qty', json: '3' }, 'qty');
    expect(await runAfterReload(action.code, page.locator('#add-A1'))).toBeUndefined();
    await expect.poll(() => page.locator('.cart-item').first().textContent()).toContain('30 EUR');
    await page.close();
    interception.detach();
    await transport.detach();

    await open('angular');
    const production = await pick(page.locator('#add-A1'));
    expect(stateAction(production, { kind: 'signal', name: 'qty', json: '3' }, 'qty')).toBeNull();
  });

  it("sets a web component's state, finding its element through the shadow roots it is in", async () => {
    await open('lit');
    const component = await pick(page.locator('#add-A1'));
    expect(component.selector).toEqual(['#root > cart-list', 'ul > cart-item:nth-of-type(1)', '#add-A1']);
    const action = actionFor(component, { kind: 'state', name: 'qty', json: '6' }, 'qty');
    expect(await runAfterReload(action.code, page.locator('#add-A1'))).toBeUndefined();
    await expect.poll(() => page.locator('.cart-item').first().textContent()).toContain('60 EUR');
  });
});
