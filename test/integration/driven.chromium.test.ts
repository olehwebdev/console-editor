/**
 * A Chromium browser driven with the workspace's changes: launched with a profile of the app's own and a debugging
 * port, every tab served the overrides (a new tab from its first request), changes served and the tabs reloaded, a tab
 * captured (and at a viewport given, as in every browser at once), the browser let go of (it stays open) and reached again rather than launched twice, and forgotten once
 * it is quit.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DrivenBrowsers } from '../../src/main/browsers';
import { readActivePort } from '../../src/main/browsers/driven/chromium/readActivePort';
import type { InterceptionSources } from '../../src/main/browsers/driven/types';
import type { FoundBrowser } from '../../src/main/browsers';
import { CdpConnection } from '../../src/main/engine/websocketTransport';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type AppEvent, type DrivenTab, type Override, type Settings } from '../../src/shared/types';
import { chromiumAvailable } from '../helpers/chromium';
import { decodePng } from '../helpers/decodePng';

async function waitFor<T>(fn: () => T | undefined | false | Promise<T | undefined | false>, timeout = 20_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe.skipIf(!chromiumAvailable)('a Chromium browser driven with your changes', () => {
  let server: Server;
  let origin: string;
  let userData: string;
  let driven: DrivenBrowsers;
  const events: AppEvent[] = [];
  const overrides: Override[] = [];
  const settings: Settings = { ...DEFAULT_SETTINGS, autoReloadOnSave: true };
  const sources = { store: { list: () => overrides, base: async () => '' }, rules: { list: () => [] }, settings: { get: () => settings } } as unknown as InterceptionSources;
  const browser: FoundBrowser = {
    id: 'desktop:test-chromium.desktop',
    name: 'Test Chromium',
    engine: 'chromium',
    // Headless here; the sandbox can't start as root (containers).
    command: [chromium.executablePath(), '--headless=new', ...(process.getuid?.() === 0 ? ['--no-sandbox'] : [])],
    urlAt: process.getuid?.() === 0 ? 3 : 2,
    iconFile: null,
    app: null,
    program: chromium.executablePath(),
    added: false,
  };
  const profile = () => join(userData, 'browsers', 'desktop_test-chromium.desktop');
  const tabs = (): DrivenTab[] => driven.list()[0]?.tabs ?? [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      const files: Record<string, [string, string]> = {
        '/page.html': ['text/html', '<!doctype html><title>upstream</title><body style="margin:0;background:#ff0000"><script src="/app.js"></script></body>'],
        '/app.js': ['text/javascript', "document.title = 'upstream';"],
      };
      const file = files[path];
      if (!file) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': file[0] }).end(file[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    userData = await mkdtemp(join(tmpdir(), 'console-editor-driven-'));
    const now = Date.now();
    overrides.push({ id: 'o1', kind: 'Script', sourceUrl: `${origin}/app.js`, match: defaultMatcherFor(`${origin}/app.js`), content: "document.title = 'overridden';", enabled: true, originalHash: null, createdAt: now, updatedAt: now });
    driven = new DrivenBrowsers({ registry: { get: async () => browser }, sources, userData, send: (event) => events.push(event) });
  });

  afterAll(async () => {
    driven?.dispose();
    // The browser outlives the app by design: quit it through its own port.
    const address = userData ? await readActivePort(profile()) : null;
    const connection = address ? await CdpConnection.connect(address).catch(() => null) : null;
    await connection?.send('Browser.close').catch(() => undefined);
    connection?.close();
    await new Promise((r) => server?.close(r));
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it('launches it with a profile of its own, and serves the overrides in the tab it opens', async () => {
    await driven.open(browser.id, `${origin}/page.html`);
    await waitFor(() => tabs().some((t) => t.url === `${origin}/page.html` && t.title === 'overridden'));
    expect(driven.list()).toEqual([{ id: browser.id, name: 'Test Chromium', version: expect.stringMatching(/^\d+\./), tabs: expect.any(Array) }]);
    expect(existsSync(join(profile(), 'DevToolsActivePort'))).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'driven-browsers-changed', driven: [{ id: browser.id }] });
  });

  it('opens another address in a new tab, served the overrides from its first request', async () => {
    await driven.open(browser.id, `${origin}/page.html?second`);
    await waitFor(() => tabs().some((t) => t.url.endsWith('?second') && t.title === 'overridden'));
    expect(tabs()).toHaveLength(2);
  });

  it('serves overrides as they change, reloading the tabs when the settings say so', async () => {
    overrides[0] = { ...overrides[0], content: "document.title = 'changed';", updatedAt: Date.now() };
    driven.onAppEvent({ type: 'overrides-changed', overrides: [] });
    await waitFor(() => tabs().length === 2 && tabs().every((t) => t.title === 'changed'));
  });

  it("captures a tab, with its address and the browser's name and version", async () => {
    const [tab] = tabs();
    const { image, url, browser: taken } = await driven.capture(browser.id, tab.id, 'viewport');
    expect(url).toBe(tab.url);
    expect(taken).toEqual({ id: browser.id, name: 'Test Chromium', version: driven.list()[0].version });
    expect(image.width).toBeGreaterThan(0);
    expect(decodePng(image.bytes).at(5, 5)).toEqual([255, 0, 0, 255]);
    await expect(driven.capture(browser.id, tab.id, 'element')).rejects.toThrow('Invalid capture area');
  });

  it('captures the whole page at an address in every driven browser, laid out in a viewport given (the app\'s)', async () => {
    const taken = await driven.captureAt(`${origin}/page.html`, { width: 400, height: 300, scale: 2 });
    expect(taken).toHaveLength(1);
    const [capture] = taken;
    if ('reason' in capture) throw new Error(capture.reason);
    expect(capture).toMatchObject({ url: `${origin}/page.html`, browser: { id: browser.id, name: 'Test Chromium' } });
    expect(capture.image).toMatchObject({ width: 800, height: 600, scale: 2, viewport: { width: 400, height: 300 } });
    // The tab showing it was used: no other opened.
    expect(tabs()).toHaveLength(2);
  });

  it('lets go of it (it stays open), and reaches it again rather than launching another', async () => {
    const port = readFileSync(join(profile(), 'DevToolsActivePort'), 'utf8');
    driven.stop(browser.id);
    expect(driven.list()).toEqual([]);
    expect(events.at(-1)).toEqual({ type: 'driven-browsers-changed', driven: [] });

    await driven.open(browser.id, `${origin}/page.html?third`);
    expect(readFileSync(join(profile(), 'DevToolsActivePort'), 'utf8')).toBe(port);
    await waitFor(() => tabs().some((t) => t.url.endsWith('?third') && t.title === 'changed'));
    expect(tabs()).toHaveLength(3);
  });

  it('refuses a browser it can\'t drive (Safari), and an address not on the web', async () => {
    const other = new DrivenBrowsers({ registry: { get: async () => ({ ...browser, name: 'Safari', engine: 'webkit' }) }, sources, userData, send: () => undefined });
    await expect(other.open(browser.id, `${origin}/page.html`)).rejects.toThrow("Safari can't be served your changes");
    await expect(driven.open(browser.id, 'file:///etc/passwd')).rejects.toThrow('Only http(s) pages');
  });

  it('forgets it once it is quit', async () => {
    const connection = await CdpConnection.connect((await readActivePort(profile()))!);
    await connection.send('Browser.close').catch(() => undefined);
    connection.close();
    await waitFor(() => driven.list().length === 0);
    expect(events.at(-1)).toEqual({ type: 'driven-browsers-changed', driven: [] });
  });
});
