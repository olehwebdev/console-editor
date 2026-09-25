/**
 * The page stack against real Chromium: a React app the test bundles from the
 * repo's own react and react-dom (production and development builds), the
 * fixture's page of what Vue, Angular, Next.js and webpack leave in a page, and a shell
 * that frames the React app from another site (its own process and session).
 */
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import type { Page } from 'playwright-core';
import { build, type Rollup } from 'vite';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type FrameStack, type Settings, type StackHit } from '../../src/shared/types';
import { STACK_HTML, STACK_PATH } from '../fixtures/stackPage';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

const ROOT = join(__dirname, '../..');
const REACT_VERSION: string = JSON.parse(readFileSync(join(ROOT, 'node_modules/react/package.json'), 'utf8')).version;

async function bundleReact(mode: 'production' | 'development'): Promise<string> {
  const result = (await build({
    configFile: false,
    logLevel: 'silent',
    mode,
    root: join(__dirname, '../fixtures/apps'),
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    build: { write: false, minify: mode === 'production', lib: { entry: 'reactApp.ts', formats: ['iife'], name: 'StackFixture' } },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[];
  const [output] = Array.isArray(result) ? result : [result];
  return (output.output[0] as Rollup.OutputChunk).code;
}

const reactPage = (script: string) => `<!doctype html><title>react</title><div id="root"></div><script src="${script}"></script>`;


async function waitFor<T>(fn: () => T | undefined, timeout = 15_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe.skipIf(!chromiumAvailable)('page stack in Chromium', () => {
  let server: Server;
  let origin: string;
  let port: number;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let services: FrameServices;
  let detachTransport: () => Promise<void>;

  beforeAll(async () => {
    const [production, development] = await Promise.all([bundleReact('production'), bundleReact('development')]);
    const routes: Record<string, [string, string]> = {
      '/react.js': ['text/javascript', production],
      '/react-dev.js': ['text/javascript', development],
      '/react.html': ['text/html', reactPage('/react.js')],
      '/react-dev.html': ['text/html', reactPage('/react-dev.js')],
      [STACK_PATH]: ['text/html', STACK_HTML],
      // Three scripts: one names its map in a comment, one in a header, one names none.
      '/maps.html': ['text/html', `${reactPage('/react.js')}<script src="/commented.js"></script><script src="/headed.js"></script><script>var inline = 1;</script>`],
      '/commented.js': ['text/javascript', 'var commented = 1;\n//# sourceMappingURL=commented.js.map'],
      '/headed.js': ['text/javascript', 'var headed = 1;'],
    };
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      const route = path === '/shell.html' ? ['text/html', `<!doctype html><title>shell</title><app-root ng-version="22.2.0"></app-root><iframe src="http://widget.localhost:${port}/react.html"></iframe>`] : routes[path];
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': route[0], ...(path === '/headed.js' ? { SourceMap: 'headed.js.map' } : {}) }).end(route[1]);
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
    await detachTransport();
    await page.close();
  });

  async function open(url: string, settings: Settings = DEFAULT_SETTINGS): Promise<void> {
    const opened = await chrome.newPage();
    page = opened.page;
    detachTransport = () => opened.transport.detach();
    services = new FrameServices(() => settings, () => undefined);
    interception = new PageInterception({ transport: opened.transport, getOverrides: () => [], getRules: () => [], getSettings: () => settings, emit: () => undefined, sessions: services });
    await interception.attach();
    await page.goto(url);
  }

  /** The stack found for the frame showing `url`, once there is one. */
  const stackAt = (url: string): Promise<FrameStack> => waitFor(() => services.inspector.list().find((s) => s.url === url));
  const hitOf = (stack: FrameStack, id: StackHit['id']) => stack.hits.find((h) => h.id === id);

  it("finds React in a production build through the hook stand-in, with the renderer's version", async () => {
    await open(`${origin}/react.html`);
    const stack = await stackAt(`${origin}/react.html`);
    expect(hitOf(stack, 'react')).toEqual({ id: 'react', signal: 'hook', version: REACT_VERSION, build: 'production' });
  });

  it("counts the frame's scripts that name a source map, by comment or by header, and names those that don't", async () => {
    await open(`${origin}/maps.html`);
    const stack = await stackAt(`${origin}/maps.html`);
    // The document's inline script isn't a file of its own.
    expect(stack.coverage).toEqual({ scripts: 3, mapped: 2, unmapped: [`${origin}/react.js`] });
  });

  it('tells a development build', async () => {
    await open(`${origin}/react-dev.html`);
    const stack = await stackAt(`${origin}/react-dev.html`);
    expect(hitOf(stack, 'react')).toEqual({ id: 'react', signal: 'hook', version: REACT_VERSION, build: 'development' });
  });

  it("finds React by its keys with Framework hooks off, and its build, though not its version; the page has no hook of ours", async () => {
    const settings = { ...DEFAULT_SETTINGS, frameworkHooks: false };
    await open(`${origin}/react.html`, settings);
    const stack = await stackAt(`${origin}/react.html`);
    expect(hitOf(stack, 'react')).toEqual({ id: 'react', signal: 'fiber', version: null, build: 'production' });
    expect(await page.evaluate(() => '__REACT_DEVTOOLS_GLOBAL_HOOK__' in globalThis)).toBe(false);

    await open(`${origin}/react-dev.html`, settings);
    expect(hitOf(await stackAt(`${origin}/react-dev.html`), 'react')).toMatchObject({ signal: 'fiber', build: 'development' });
  });

  it('reads what Vue, Pinia, Angular, Next.js and webpack leave in a page', async () => {
    await open(`${origin}${STACK_PATH}`);
    const stack = await stackAt(`${origin}${STACK_PATH}`);
    expect(stack.hits).toEqual([
      { id: 'vue', signal: 'app', version: '3.5.43', build: 'production' },
      { id: 'pinia', signal: 'vue', version: null, build: null },
      { id: 'angular', signal: 'attribute', version: '17.3.0', build: 'production' },
      { id: 'next', signal: 'data', version: '15.1.0', build: null },
      { id: 'webpack', signal: 'chunks', version: null, build: null },
    ]);
  });

  it("looks at a cross-site iframe in its own session, whose React found the stand-in before it loaded", async () => {
    await open(`${origin}/shell.html`);
    const top = await stackAt(`${origin}/shell.html`);
    const widget = await stackAt(`http://widget.localhost:${port}/react.html`);
    expect(top.hits.map((h) => h.id)).toEqual(['angular']);
    expect(hitOf(widget, 'react')).toEqual({ id: 'react', signal: 'hook', version: REACT_VERSION, build: 'production' });
    expect(services.inspector.list().map((s) => s.url)).toEqual([`${origin}/shell.html`, `http://widget.localhost:${port}/react.html`]);
  });

  it('leaves no row in the console, and finds a frame again when asked', async () => {
    await open(`${origin}/react.html`);
    const first = await stackAt(`${origin}/react.html`);
    await services.inspector.scan();
    const again = services.inspector.list().find((s) => s.frameId === first.frameId)!;
    expect(again.scannedAt).toBeGreaterThanOrEqual(first.scannedAt);
    expect(again.hits).toEqual(first.hits);
    expect(services.console.listEntries().filter((e) => e.source === 'input' || e.source === 'result')).toEqual([]);
  });
});
