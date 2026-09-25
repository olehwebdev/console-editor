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
import { NO_ELEMENT, NOT_JSON, NOT_SETTABLE, PICK_GONE } from '../../src/main/inspector/constants';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type CodeLocation, type ComponentTreeLevel, type InspectedComponent, type InspectHover, type RenderCommit, type Settings } from '../../src/shared/types';
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
      ['renders', 'reactRenders.ts', 'production'],
      ['renders-dev', 'reactRenders.ts', 'development'],
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

  async function open(url: string, settings: Settings = DEFAULT_SETTINGS): Promise<void> {
    events = [];
    const opened = await chrome.newPage();
    page = opened.page;
    transport = opened.transport;
    services = new FrameServices(() => settings, (e) => events.push(e));
    interception = new PageInterception({ transport, getOverrides: () => [], getRules: () => [], getSettings: () => settings, emit: () => undefined, sessions: services });
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

  it("sets a useState hook's value, and reads the component as it rendered with it; refuses what isn't JSON or can't be set", async () => {
    await open(`${origin}/react.html`);
    const { component } = await pick(page.locator('#add-A1'));
    expect(component.state).toMatchObject([{ name: '1', kind: 'state', editable: true }]);
    const set = await services.inspector.setComponentState(component.pickId, 0, { kind: 'state', name: '1', json: '5' });
    expect(set.state).toMatchObject([{ name: '1', preview: '5' }]);
    expect(await page.locator('.cart-item').first().textContent()).toContain('50 EUR');
    await expect(services.inspector.setComponentState(component.pickId, 0, { kind: 'state', name: '1', json: 'five' })).rejects.toThrow(NOT_JSON);
    // CartList holds no state: there is no hook 1 to set.
    await expect(services.inspector.setComponentState(component.pickId, 1, { kind: 'state', name: '1', json: '5' })).rejects.toThrow(NOT_SETTABLE);
  });

  it("sets a Vue component's data and a ref in its setupState, not a computed one", async () => {
    await open(`${origin}/vue.html`);
    const { component } = await pick(page.locator('#add-A1'));
    const list = await services.inspector.inspectComponent(component.pickId, 1);
    expect(list.state.map((s) => [s.kind, s.name, s.preview, s.editable])).toEqual([
      ['setup', 'open', 'true', true],
      ['setup', 'count', '2', false],
      ['data', 'title', '"Cart"', true],
    ]);
    await services.inspector.setComponentState(component.pickId, 1, { kind: 'data', name: 'title', json: '"Basket"' });
    const set = await services.inspector.setComponentState(component.pickId, 1, { kind: 'setup', name: 'open', json: 'false' });
    expect(set.state.map((s) => s.preview)).toEqual(['false', '2', '"Basket"']);
    expect(await page.locator('#list').evaluate((el) => [el.dataset.title, el.dataset.open])).toEqual(['Basket', 'false']);
    await expect(services.inspector.setComponentState(component.pickId, 1, { kind: 'setup', name: 'count', json: '3' })).rejects.toThrow(NOT_SETTABLE);
  });

  /** The top frame's Components tree at `path`, once the console knows the frame. */
  const treeAt = async (path: number[]) => {
    const frame = await waitFor(() => services.console.listFrames()[0]);
    return (await services.inspector.componentTree(frame.id, path)) as ComponentTreeLevel;
  };
  const shape = (level: ComponentTreeLevel) => level.nodes.map((n) => [n.name, n.key, n.children]);

  it("lists a React app's components a level at a time, from the roots the hook stand-in kept, and opens one as a pick", async () => {
    await open(`${origin}/react-dev.html`);
    await page.locator('#add-A1').waitFor();
    expect(shape(await treeAt([]))).toEqual([['App', null, 1]]);
    expect(shape(await treeAt([0]))).toEqual([['CartList', null, 2]]);
    const items = await treeAt([0, 0]);
    expect(shape(items)).toEqual([['CartItem', 'A1', 0], ['CartItem', 'B2', 0]]);
    expect(items.nodes[1].location?.url).toBe(`${origin}/react-dev.js`);
    expect(await services.inspector.componentTree(items.frameId, [0, 0, 5])).toBeNull();

    // A component opens as a pick of its first element: CartList's is the <ul>, which it rendered itself.
    const list = await services.inspector.openTreeNode(items.frameId, [0, 0]);
    expect(list).toMatchObject({ depth: 0, element: { tag: 'ul' }, chain: [{ name: 'CartList' }, { name: 'App' }], path: [0, 0] });
    // App renders no element of its own: its first is CartList's, where App is one up the chain.
    expect(await services.inspector.openTreeNode(items.frameId, [0])).toMatchObject({ depth: 1, element: { tag: 'ul' }, chain: [{ name: 'CartList' }, { name: 'App' }], path: [0] });
    await expect(services.inspector.openTreeNode(items.frameId, [3])).rejects.toThrow(NO_ELEMENT);
  });

  it("finds React's roots by their containers without the hook, and tells a pick's path in the tree", async () => {
    await open(`${origin}/react.html`, { ...DEFAULT_SETTINGS, frameworkHooks: false });
    const { component } = await pick(page.locator('#add-B2'));
    expect(component.path).toEqual([0, 0, 1]);
    expect((await treeAt([0, 0])).nodes.map((n) => n.key)).toEqual(['A1', 'B2']);
  });

  it("lists a Vue app's components, and tells a pick's path", async () => {
    await open(`${origin}/vue.html`);
    const { component } = await pick(page.locator('#add-B2'));
    expect(component.path).toEqual([0, 0, 1]);
    expect(shape(await treeAt([]))).toEqual([['App', null, 1]]);
    expect(shape(await treeAt([0, 0]))).toEqual([['CartItem', 'A1', 0], ['CartItem', 'B2', 0]]);
    const item = await services.inspector.openTreeNode(component.frameId!, [0, 0, 0]);
    expect(item).toMatchObject({ framework: 'vue', element: { tag: 'li' }, chain: [{ name: 'CartItem', key: 'A1' }, { name: 'CartList' }, { name: 'App' }] });
  });

  /** The commits recorded so far, as `name#key kind reasons` lines per commit. */
  const recorded = () =>
    events.flatMap((e) => (e.type === 'renders-recorded' ? e.commits : []));
  const describeCommit = (commit: RenderCommit) =>
    commit.components.map((c) => [`${c.name}${c.key ? `#${c.key}` : ''}`, c.kind + (c.memo ? '(memo)' : ''), c.reasons.map((r) => `${r.kind}:${r.changes.map((ch) => `${ch.name} ${ch.from}→${ch.to}`).join(',')}`).join(' ')].join(' ').trim());
  /** Clicks a button of the page and waits for the commit it makes. */
  async function commitOf(selector: string): Promise<RenderCommit> {
    const before = recorded().length;
    await page.click(selector);
    return waitFor(() => recorded()[before]);
  }

  it('records why each component rendered, commit by commit, with what triggered it and where each is defined', async () => {
    await open(`${origin}/renders-dev.html`);
    await page.locator('#add-A1').waitFor();
    await services.inspector.recordRenders(true);
    expect(events).toContainEqual({ type: 'renders-recording', recording: true });

    const add = await commitOf('#add-A1');
    expect(add.trigger).toEqual({ type: 'click', target: 'button#add-A1' });
    expect(add.frameId).toBe(services.console.listFrames()[0].id);
    expect(add.duration).toEqual(expect.any(Number));
    expect(describeCommit(add)).toEqual(['CartBadge render store:1 0→1', 'CartItem#A1 render state:1 1→2']);
    expect(add.components[1].location).toMatchObject({ url: `${origin}/renders-dev.js` });

    expect(describeCommit(await commitOf('#currency'))).toEqual([
      'App render state:1 "EUR"→"USD"',
      'CartBadge render parent:',
      'CartList skip(memo)',
      'CartItem#A1 render context:Context "EUR"→"USD"',
      'CartItem#B2 render context:Context "EUR"→"USD"',
      'Clock render parent:',
      'Footer render parent:',
    ]);
    expect(describeCommit(await commitOf('#theme'))).toEqual(['App render state:2 "dark"→"light"', 'CartBadge render parent:', 'CartList skip(memo)', 'Clock render parent:', 'Footer render props:note "dark"→"light"']);
    expect(describeCommit(await commitOf('#tick'))).toEqual(['Clock render state:ticks 0→1']);
    expect(recorded().map((c) => c.id)).toEqual([1, 2, 3, 4]);

    await services.inspector.recordRenders(false);
    await page.click('#tick');
    await new Promise((r) => setTimeout(r, 300));
    expect(recorded()).toHaveLength(4);
  });

  it("records a production build's mount from the start of a document loaded while recording, its functions placed through the source map", async () => {
    await open(`${origin}/renders.html`);
    await services.inspector.recordRenders(true);
    await page.reload();
    const mount = await waitFor(() => recorded()[0]);
    expect(mount.trigger).toBeNull();
    expect(mount.duration).toBeNull();
    expect(mount.components.map((c) => c.kind)).toEqual(Array(7).fill('mount'));
    expect(mount.components.map((c) => original(c.location)?.line)).toEqual([
      lineOf('reactRenders.ts', 'function App'),
      lineOf('reactRenders.ts', 'function CartBadge'),
      lineOf('reactRenders.ts', 'const CartList = memo'),
      lineOf('reactRenders.ts', 'function CartItem'),
      lineOf('reactRenders.ts', 'function CartItem'),
      lineOf('reactRenders.ts', 'class Clock'),
      lineOf('reactRenders.ts', 'function Footer'),
    ]);
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
