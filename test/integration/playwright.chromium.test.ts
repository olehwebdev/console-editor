/**
 * A browser driven through Playwright, as the WebKit build the app downloads is, with Playwright's Chromium standing
 * in for WebKit (whose build can't be downloaded here; the driver only speaks Playwright's API, the same for both): a
 * script override served, a header rule and a block rule applied, a cross-origin request an override answers and a
 * GraphQL operation named by the body, changes served and the tabs reloaded, a tab captured and the whole page at a
 * viewport given, the design laid over its tabs and out of captures, and letting go of it quitting it, its cookies kept.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FoundBrowser } from '../../src/main/browsers';
import { connectPlaywright } from '../../src/main/browsers/driven/playwright/connectPlaywright';
import type { Driver, InterceptionSources } from '../../src/main/browsers/driven/types';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type Override, type Rule } from '../../src/shared/types';
import { chromiumAvailable } from '../helpers/chromium';
import { decodePng } from '../helpers/decodePng';
import { encodePng } from '../helpers/encodePng';

async function waitFor<T>(fn: () => T | undefined | false | Promise<T | undefined | false>, timeout = 20_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe.skipIf(!chromiumAvailable)('A browser driven through Playwright (as WebKit is)', () => {
  let server: Server;
  let origin: string;
  let other: string;
  let userData: string;
  let driver: Driver;
  let closed = 0;
  const overrides: Override[] = [];
  const rules: Rule[] = [];
  const sources = { store: { list: () => overrides, base: async () => '' }, rules: { list: () => rules }, settings: { get: () => DEFAULT_SETTINGS } } as unknown as InterceptionSources;
  const browser: FoundBrowser = { id: 'playwright:webkit', name: 'WebKit', engine: 'webkit', command: [], urlAt: 0, iconFile: null, app: null, program: chromium.executablePath(), added: false };
  const now = Date.now();
  const override = (sourceUrl: string, kind: Override['kind'], content: string, extra: Partial<Override> = {}): Override => ({ id: `o${overrides.length}`, kind, sourceUrl, match: defaultMatcherFor(sourceUrl), content, enabled: true, originalHash: null, createdAt: now, updatedAt: now, ...extra });
  const answered = { status: 200, delayMs: 0, headers: [], send: false, patch: false };
  const titled = async (url: string) => {
    await driver.readTabs();
    return driver.list().tabs.find((t) => t.url === url)?.title ?? '';
  };

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      if (path === '/graphql') return void res.writeHead(req.method === 'OPTIONS' ? 404 : 200, { 'access-control-allow-origin': '*' }).end('upstream');
      const ask = `(name) => fetch('${other}/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operationName: name }) }).then((r) => r.text(), () => 'refused')`;
      const script = `Promise.all([fetch('/api').then((r) => r.headers.get('x-rule')), fetch('/blocked.js').then(() => 'loaded', () => 'blocked'), fetch('${other}/data', { method: 'PUT' }).then((r) => r.text(), () => 'refused'), (${ask})('GetUser'), (${ask})('GetCart')]).then((all) => { document.title = [window.appValue, ...all].join(' '); });`;
      const files: Record<string, [string, string]> = {
        '/page.html': ['text/html', `<!doctype html><title>upstream</title><body style="margin:0;background:#ff0000"><script src="/app.js"></script><script>${script}</script></body>`],
        '/design.html': ['text/html', `<!doctype html><title>-</title><body style="margin:0;background:#0000ff"><script>setInterval(() => { const c = document.getElementById('__console-editor-overlay'); document.title = (c ? 'design ' + getComputedStyle(c).opacity : 'no design') + ' ' + innerWidth; }, 100);</script></body>`],
        '/app.js': ['text/javascript', "window.appValue = 'upstream';"],
        '/api': ['application/json', '{}'],
        '/blocked.js': ['text/javascript', ''],
      };
      const file = files[path];
      if (!file) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': file[0], 'set-cookie': 'visited=yes; Path=/' }).end(file[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as AddressInfo;
    origin = `http://127.0.0.1:${port}`;
    other = `http://localhost:${port}`;
    userData = await mkdtemp(join(tmpdir(), 'console-editor-playwright-'));
    overrides.push(
      override(`${origin}/app.js`, 'Script', "window.appValue = 'overridden';"),
      override(`${other}/data`, 'Fetch', 'from-override', { request: { method: 'PUT', operation: '' }, response: answered }),
      override(`${other}/graphql`, 'Fetch', 'from-graphql', { request: { method: 'POST', operation: 'GetUser' }, response: answered }),
    );
    const rule = { enabled: true, resourceTypes: [], createdAt: now, updatedAt: now };
    rules.push({ ...rule, id: 'r1', action: 'headers', match: defaultMatcherFor(`${origin}/api`), headers: [{ operation: 'set', name: 'x-rule', value: 'yes' }] }, { ...rule, id: 'r2', action: 'block', match: defaultMatcherFor(`${origin}/blocked.js`) });
    const deps = { listedAs: { id: browser.id, name: browser.name, everyday: false }, home: userData, sources, userData, changed: () => undefined, closed: () => closed++ };
    driver = await connectPlaywright({ type: chromium, executablePath: chromium.executablePath(), headless: true }, browser, deps);
  });

  afterAll(async () => {
    driver?.stop();
    await new Promise((r) => server?.close(r));
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it('serves the overrides and applies the rules, a GraphQL operation answered by the body sent', async () => {
    await driver.open(`${origin}/page.html`);
    await waitFor(async () => (await titled(`${origin}/page.html`)) === 'overridden yes blocked from-override from-graphql upstream');
    expect(driver.list()).toMatchObject({ id: browser.id, browserId: browser.id, name: 'WebKit', everyday: false, version: expect.stringMatching(/^\d+\./) });
  });

  it('serves overrides as they change once its tabs reload', async () => {
    overrides[0] = { ...overrides[0], content: "window.appValue = 'changed';", updatedAt: Date.now() };
    await driver.refresh();
    await driver.reload();
    await waitFor(async () => (await titled(`${origin}/page.html`)).startsWith('changed yes blocked'));
  });

  it('captures a tab, and the whole page at a viewport given (in a context made for it)', async () => {
    const [tab] = driver.list().tabs;
    const { image } = await driver.capture(tab.id, 'viewport');
    expect(decodePng(image.bytes).at(5, 5)).toEqual([255, 0, 0, 255]);
    const { image: at } = await driver.captureAt(`${origin}/page.html`, { width: 400, height: 300, scale: 2 });
    expect(at).toMatchObject({ width: 800, height: 600, scale: 2, viewport: { width: 400, height: 300 } });
    expect(driver.list().tabs).toHaveLength(1);
  });

  it('lays the design over its tabs at its width, keeps it after a reload and out of captures, and takes it off', async () => {
    const url = `${origin}/design.html`;
    await driver.open(url);
    const settings = { opacity: 0.5, blend: 'normal', invert: false, x: 0, y: 0, attached: 'page', hidden: false, fitWidth: true } as const;
    const design = { key: 'd1', base64: encodePng(40, 30, () => [255, 0, 0]).toString('base64'), width: 300, height: 200, settings };
    await driver.setDesign(design);
    await waitFor(async () => (await titled(url)) === 'design 0.5 300');
    const tab = driver.list().tabs.find((t) => t.url === url)!;
    const { image } = await driver.capture(tab.id, 'viewport');
    expect(decodePng(image.bytes).at(5, 5)).toEqual([0, 0, 255, 255]);
    expect(image.viewport.width).not.toBe(300);
    await waitFor(async () => (await titled(url)) === 'design 0.5 300');
    await driver.reload();
    await waitFor(async () => (await titled(url)) === 'design 0.5 300');
    await driver.setDesign(null);
    await waitFor(async () => /^no design \d+$/.test(await titled(url)) && !(await titled(url)).endsWith(' 300'));
  });

  it('quits it once let go of, keeping its cookies for next time', async () => {
    driver.stop();
    const state = join(userData, 'browsers', 'playwright_webkit', 'storage-state.json');
    await waitFor(() => existsSync(state));
    expect((JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(state, 'utf8'))) as { cookies: Array<{ name: string }> }).cookies.map((c) => c.name)).toContain('visited');
    expect(closed).toBe(0);
  });
});
