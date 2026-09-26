/**
 * The component inspector on the frameworks after React and Vue 3, against real
 * Chromium: carts in Angular (production, read through its private view
 * registry, and development, through `window.ng`), Vue 2 and Lit (web
 * components), bundled by the test from the repo's own packages; and the DOM
 * listeners of a picked element, a plain page's and a Vue 3 page's.
 */
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import type { Locator, Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { ANGULAR_REGISTRY_GLOBAL, NOT_SETTABLE } from '../../src/main/inspector/constants';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type CodeLocation, type ComponentTreeLevel, type InspectedComponent, type InspectHover } from '../../src/shared/types';
import { bundleApp } from '../helpers/bundleApp';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

const APPS = join(__dirname, '../fixtures/apps');
/** The 1-based line a fixture app declares something on. */
const lineOf = (file: string, text: string) => readFileSync(join(APPS, file), 'utf8').split('\n').findIndex((line) => line.includes(text)) + 1;

/** A page with no framework: a button with a named listener and an inline one. */
const PLAIN_HTML = `<!doctype html><title>plain</title><button id="buy">Buy</button><script>
function onBuy() {}
document.getElementById('buy').addEventListener('click', onBuy);
document.getElementById('buy').addEventListener('pointerdown', () => {}, { passive: true, once: true });
</script>`;

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 15_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe.skipIf(!chromiumAvailable)('component inspector on Angular, Vue 2, web components and plain pages', () => {
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
    const routes = new Map<string, [string, string]>([['/plain.html', ['text/html', PLAIN_HTML]]]);
    const builds = [
      ['angular', 'angularCart.ts', 'production', '<app-root></app-root>'],
      ['angular-dev', 'angularCart.ts', 'development', '<app-root></app-root>'],
      ['vue2', 'vue2Cart.ts', 'production', '<div id="root"></div>'],
      ['lit', 'litCart.ts', 'production', '<div id="root"></div>'],
      ['vue', 'vueCart.ts', 'production', '<div id="root"></div>'],
    ] as const;
    for (const [name, entry, mode, body] of builds) {
      const app = await bundleApp(entry, name, mode);
      routes.set(`/${name}.js`, ['text/javascript', app.code]);
      routes.set(`/${name}.html`, ['text/html', `<!doctype html><title>${name}</title>${body}<script src="/${name}.js"></script>`]);
      if (app.map) {
        routes.set(`/${name}.js.map`, ['application/json', app.map]);
        maps.set(`/${name}.js`, new TraceMap(app.map));
      }
    }
    server = createServer((req, res) => {
      const route = routes.get(new URL(req.url ?? '/', 'http://x').pathname);
      if (!route) return void res.writeHead(404).end();
      // Minified code keeps characters outside ASCII (Angular's compiler has Unicode ranges).
      res.writeHead(200, { 'content-type': `${route[0]}; charset=utf-8` }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    chrome = await launchChromium();
  }, 120_000);

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

  /** The line of a fixture a production bundle's location comes from, through its source map. */
  const lineIn = (location: CodeLocation | null) => {
    const map = location && maps.get(new URL(location.url).pathname);
    return map ? originalPositionFor(map, { line: location!.line + 1, column: location!.column }).line : null;
  };
  const treeAt = async (path: number[]) => {
    const frame = await waitFor(() => services.console.listFrames()[0]);
    return (await services.inspector.componentTree(frame.id, path)) as ComponentTreeLevel;
  };
  const shape = (level: ComponentTreeLevel) => level.nodes.map((n) => [n.framework, n.name, n.key, n.children]);

  it("reads a production Angular component through its private view registry: inputs, signals and fields, each class placed by the map", async () => {
    await open(`${origin}/angular.html`);
    const { hover, component } = await pick(page.locator('#add-A1'));
    // Hovering doesn't walk the heap for the registry: hosts are named by their tags.
    expect(hover).toMatchObject({ framework: 'angular', chain: ['app-cart-item', 'app-root'] });
    expect(component).toMatchObject({ framework: 'angular', build: 'production', depth: 0, element: { tag: 'button', id: 'add-A1' } });
    expect(component.chain.map((link) => lineIn(link.location))).toEqual([lineOf('angularCart.ts', 'class CartItem'), lineOf('angularCart.ts', 'class App')]);
    expect(component.props.map((p) => [p.name, p.preview])).toEqual([['sku', '"A1"'], ['price', '10']]);
    expect(component.state.map((s) => [s.name, s.kind, s.preview, s.editable])).toEqual([
      ['qty', 'signal', '1', true],
      ['label', 'field', '"item"', false],
    ]);
    const set = await services.inspector.setComponentState(component.pickId, 0, { kind: 'signal', name: 'qty', json: '4' });
    expect(set.state[0]).toMatchObject({ name: 'qty', preview: '4' });
    await expect.poll(() => page.locator('.cart-item').first().textContent()).toContain('40 EUR');
    await expect(services.inspector.setComponentState(component.pickId, 0, { kind: 'field', name: 'label', json: '"x"' })).rejects.toThrow(NOT_SETTABLE);
  });

  it("reads a development Angular build through window.ng, and lists its components as a tree", async () => {
    await open(`${origin}/angular-dev.html`);
    const { hover, component } = await pick(page.locator('#add-B2'));
    expect(hover.chain).toEqual(['CartItem', 'App']);
    expect(component).toMatchObject({ framework: 'angular', build: 'development', chain: [{ name: 'CartItem' }, { name: 'App' }], path: [0, 1] });
    expect(shape(await treeAt([]))).toEqual([['angular', 'App', null, 2]]);
    expect(shape(await treeAt([0]))).toEqual([
      ['angular', 'CartItem', null, 0],
      ['angular', 'CartItem', null, 0],
    ]);
    expect(await services.inspector.openTreeNode(component.frameId!, [0, 0])).toMatchObject({ element: { tag: 'app-cart-item' }, depth: 0, chain: [{ name: 'CartItem' }, { name: 'App' }] });
  });

  it("tells a production Angular build's tree through the registry too", async () => {
    await open(`${origin}/angular.html`);
    await page.locator('#add-A1').waitFor();
    const top = await treeAt([]);
    expect(top.nodes.map((n) => lineIn(n.location))).toEqual([lineOf('angularCart.ts', 'class App')]);
    // Found once, the registry is kept on the page's window: the next read doesn't walk the heap for it.
    const sent: string[] = [];
    const send = transport.send.bind(transport);
    transport.send = ((method: string, params?: Record<string, unknown>) => (sent.push(method), send(method, params))) as typeof transport.send;
    expect((await treeAt([0])).nodes).toHaveLength(2);
    transport.send = send;
    expect(sent).not.toContain('Runtime.queryObjects');
    expect(await page.evaluate((key) => [key in window, Object.keys(window).includes(key)], ANGULAR_REGISTRY_GLOBAL)).toEqual([true, false]);
  });

  it('reads a Vue 2 component: props, data it can set, what the app provides, the chain and the tree', async () => {
    await open(`${origin}/vue2.html`);
    const { hover, component } = await pick(page.locator('#add-A1'));
    expect(hover.chain).toEqual(['CartItem', 'CartList', 'App']);
    expect(component).toMatchObject({ framework: 'vue2', build: 'production', chain: [{ name: 'CartItem', key: 'A1' }, { name: 'CartList' }, { name: 'App' }], path: [0, 0, 0] });
    expect(component.props.map((p) => [p.name, p.preview])).toEqual([['sku', '"A1"'], ['price', '10']]);
    expect(component.state).toMatchObject([{ name: 'qty', kind: 'data', preview: '1', editable: true }]);
    expect(lineIn(component.chain[0].location)).toBe(lineOf('vue2Cart.ts', 'render(h) {'));
    expect((await services.inspector.inspectComponent(component.pickId, 2)).context).toMatchObject([{ name: 'currency', preview: '"EUR"', provider: 'App' }]);
    await services.inspector.setComponentState(component.pickId, 0, { kind: 'data', name: 'qty', json: '3' });
    await expect.poll(() => page.locator('.cart-item').first().textContent()).toContain('30 EUR');
    expect(shape(await treeAt([0]))).toEqual([['vue2', 'CartList', null, 2]]);
  });

  it("reads a web component in its shadow root: Lit's properties and state, the host chain, the tree", async () => {
    await open(`${origin}/lit.html`);
    const { hover, component } = await pick(page.locator('cart-item').first().locator('#add-A1'));
    expect(hover).toMatchObject({ framework: 'element', element: { tag: 'button', id: 'add-A1' }, chain: ['cart-item', 'cart-list'] });
    expect(component).toMatchObject({ framework: 'element', build: null, path: [0, 0] });
    // V8 places a class that has a constructor of its own at that constructor.
    expect(lineIn(component.chain[0].location)).toBe(lineOf('litCart.ts', 'constructor() {'));
    expect(component.props.map((p) => [p.name, p.preview])).toEqual([['sku', '"A1"'], ['price', '10']]);
    expect(component.state).toMatchObject([{ name: 'qty', kind: 'state', preview: '1', editable: true }]);
    await services.inspector.setComponentState(component.pickId, 0, { kind: 'state', name: 'qty', json: '2' });
    await expect.poll(() => page.locator('cart-item').first().locator('.cart-item').textContent()).toContain('20 EUR');
    expect(shape(await treeAt([]))).toEqual([['element', 'cart-list', null, 2]]);
  });

  it("lists a plain page's listeners on the picked element, each with its function's name, place and flags", async () => {
    await open(`${origin}/plain.html`);
    const { component } = await pick(page.locator('#buy'));
    expect(component.framework).toBeNull();
    expect(component.listeners).toEqual([
      { type: 'click', name: 'onBuy', location: { url: `${origin}/plain.html`, line: 1, column: expect.any(Number) }, capture: false, once: false, passive: false },
      { type: 'pointerdown', name: 'anonymous', location: { url: `${origin}/plain.html`, line: 3, column: expect.any(Number) }, capture: false, once: true, passive: true },
    ]);
  });

  it("names the function a Vue 3 listener runs, not Vue's invoker", async () => {
    await open(`${origin}/vue.html`);
    const { component } = await pick(page.locator('#add-A1'));
    expect(component.listeners.map((l) => [l.type, lineIn(l.location)])).toEqual([['click', lineOf('vueCart.ts', 'function handleAdd')]]);
  });
});
