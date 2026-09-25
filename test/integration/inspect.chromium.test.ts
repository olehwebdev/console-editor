/**
 * Picking an element and reading its component, against real Chromium: carts in
 * React and Vue the test bundles from the repo's own dependencies, as production
 * builds (minified, with source maps) and development builds, and a shell that
 * frames the React cart from another site (its own process and session). The
 * pointer and the click are real input, as a user's would be.
 */
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import type { Locator, Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { PICK_GONE } from '../../src/main/inspector/constants';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type CodeLocation, type InspectedComponent, type InspectHover } from '../../src/shared/types';
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

describe.skipIf(!chromiumAvailable)('component inspector in Chromium', () => {
  let server: Server;
  let origin: string;
  let port: number;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let services: FrameServices;
  let transport: Awaited<ReturnType<ChromiumHarness['newPage']>>['transport'];
  let events: AppEvent[];
  const maps = new Map<string, TraceMap>();

  beforeAll(async () => {
    const routes = new Map<string, [string, string]>();
    const builds = [
      ['react', 'reactCart.ts', 'production'],
      ['react-dev', 'reactCart.ts', 'development'],
      ['vue', 'vueCart.ts', 'production'],
      ['vue-dev', 'vueCart.ts', 'development'],
    ] as const;
    for (const [name, entry, mode] of builds) {
      const app = await bundleApp(entry, name, mode);
      routes.set(`/${name}.js`, ['text/javascript', app.code]);
      routes.set(`/${name}.html`, ['text/html', `<!doctype html><title>${name}</title><div id="root"></div><script src="/${name}.js"></script>`]);
      if (app.map) {
        routes.set(`/${name}.js.map`, ['application/json', app.map]);
        maps.set(`/${name}.js`, new TraceMap(app.map));
      }
    }
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      const route = path === '/shell.html' ? ['text/html', `<!doctype html><title>shell</title><p>shell</p><iframe src="http://widget.localhost:${port}/react.html"></iframe>`] : routes.get(path);
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': route[0] }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    port = (server.address() as AddressInfo).port;
    origin = `http://127.0.0.1:${port}`;
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

  async function open(url: string): Promise<void> {
    events = [];
    const opened = await chrome.newPage();
    page = opened.page;
    transport = opened.transport;
    services = new FrameServices(() => DEFAULT_SETTINGS, (e) => events.push(e));
    interception = new PageInterception({ transport, getOverrides: () => [], getRules: () => [], getSettings: () => DEFAULT_SETTINGS, emit: () => undefined, sessions: services });
    await interception.attach();
    await page.goto(url);
  }

  const lastHover = () => events.filter((e) => e.type === 'inspect-hover').at(-1)?.hover as InspectHover | null | undefined;
  const picking = () => events.filter((e) => e.type === 'inspect-picking').at(-1)?.picking;

  /** Picks `target` with the pointer: moves onto it (hovering), then clicks. */
  async function pick(target: Locator): Promise<{ hover: InspectHover; component: InspectedComponent }> {
    await target.waitFor();
    await services.inspector.startPicking();
    const box = (await target.boundingBox())!;
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    const hover = await waitFor(() => lastHover() ?? undefined);
    await page.mouse.click(x, y);
    const picked = await waitFor(() => events.find((e) => e.type === 'inspect-picked'));
    return { hover, component: (picked as Extract<AppEvent, { type: 'inspect-picked' }>).component };
  }

  /** Where a production bundle's location comes from, through its source map. */
  const original = (location: CodeLocation | null) => {
    const map = location && maps.get(new URL(location.url).pathname);
    return map ? originalPositionFor(map, { line: location!.line + 1, column: location!.column }) : null;
  };

  it('reads a production React component: the chain, props, state, context and handler, each function traced to its source', async () => {
    await open(`${origin}/react.html`);
    const { hover, component } = await pick(page.locator('#add-A1'));

    expect(hover).toMatchObject({ element: { tag: 'button', id: 'add-A1' }, framework: 'react' });
    expect(hover.chain).toHaveLength(3);
    expect(component).toMatchObject({ framework: 'react', build: 'production', depth: 0, element: { tag: 'button', id: 'add-A1' } });
    // Vite's minifier writes maps with no names: the app reads them off the original source (tested with the worker).
    expect(component.chain.map((link) => original(link.location)).map((p) => [p?.source?.endsWith('reactCart.ts'), p?.line])).toEqual([
      [true, lineOf('reactCart.ts', 'function CartItem')],
      [true, lineOf('reactCart.ts', 'function CartList')],
      [true, lineOf('reactCart.ts', 'function App')],
    ]);
    expect(component.chain[0].key).toBe('A1');
    expect(component.props.map((p) => [p.name, p.preview])).toEqual([['sku', '"A1"'], ['price', '10']]);
    expect(component.state.map((s) => [s.kind, s.preview])).toEqual([['state', '1']]);
    expect(component.context).toEqual([{ name: 'Context', preview: '"EUR"', provider: component.chain[2].name, location: component.chain[2].location }]);
    expect(component.handlers.map((h) => [h.name, original(h.location)?.line])).toEqual([['onClick', lineOf('reactCart.ts', 'function handleAdd')]]);
  });

  it("stops picking on a click, which the page never gets, and makes the element the console's $0", async () => {
    await open(`${origin}/react.html`);
    await pick(page.locator('#add-A1'));
    expect(picking()).toBe(false);
    expect(await page.locator('.cart-item').first().textContent()).toContain('10 EUR');
    const reply = await transport.send<{ result: { value: string } }>('Runtime.evaluate', { expression: '$0.id', includeCommandLineAPI: true, returnByValue: true });
    expect(reply.result.value).toBe('add-A1');
  });

  it('reads the other components of the chain, and says when the element is gone', async () => {
    await open(`${origin}/react.html`);
    const { component } = await pick(page.locator('#add-A1'));
    const list = await services.inspector.inspectComponent(component.pickId, 1);
    expect(list).toMatchObject({ depth: 1, props: [{ name: 'items', preview: 'Array(2)' }], state: [] });
    await page.goto(`${origin}/vue.html`);
    await expect(services.inspector.inspectComponent(component.pickId, 0)).rejects.toThrow(PICK_GONE);
  });

  it('names a development build\'s components itself', async () => {
    await open(`${origin}/react-dev.html`);
    const { hover, component } = await pick(page.locator('#add-B2'));
    expect(hover.chain).toEqual(['CartItem', 'CartList', 'App']);
    expect(component).toMatchObject({ build: 'development', chain: [{ name: 'CartItem', key: 'B2' }, { name: 'CartList' }, { name: 'App' }] });
    expect(component.handlers).toMatchObject([{ name: 'onClick', function: 'handleAdd' }]);
  });

  it('reads a production Vue component through its app\'s vnode tree, and what the app provides', async () => {
    await open(`${origin}/vue.html`);
    const { component } = await pick(page.locator('#add-A1'));
    expect(component).toMatchObject({ framework: 'vue', build: 'production', chain: [{ name: 'CartItem', key: 'A1' }, { name: 'CartList' }, { name: 'App' }] });
    expect(component.props.map((p) => [p.name, p.preview])).toEqual([['sku', '"A1"'], ['price', '10']]);
    expect(original(component.chain[0].location)?.line).toBe(lineOf('vueCart.ts', 'setup(props)'));
    expect(component.handlers.map((h) => [h.name, original(h.location)?.line])).toEqual([['onClick', lineOf('vueCart.ts', 'function handleAdd')]]);
    const app = await services.inspector.inspectComponent(component.pickId, 2);
    expect(app.context).toMatchObject([{ name: 'currency', preview: '"EUR"', provider: 'App' }]);
  });

  it('reads a development Vue build from the element itself', async () => {
    await open(`${origin}/vue-dev.html`);
    const { component } = await pick(page.locator('#add-B2'));
    expect(component).toMatchObject({ framework: 'vue', build: 'development', chain: [{ name: 'CartItem', key: 'B2' }, { name: 'CartList' }, { name: 'App' }] });
  });

  it("picks inside a cross-site iframe, on the iframe's own session", async () => {
    await open(`${origin}/shell.html`);
    const widget = page.frameLocator('iframe').locator('#add-A1');
    const { component } = await pick(widget);
    const frame = await waitFor(() => services.console.listFrames().find((f) => f.url === `http://widget.localhost:${port}/react.html`));
    expect(component).toMatchObject({ framework: 'react', frameId: frame.id, element: { id: 'add-A1' } });
  });

  it('stops picking on Esc in the page', async () => {
    await open(`${origin}/react.html`);
    await page.locator('#add-A1').waitFor();
    await services.inspector.startPicking();
    expect(picking()).toBe(true);
    await page.mouse.move(10, 10);
    await page.keyboard.press('Escape');
    await waitFor(() => picking() === false);
  });
});
