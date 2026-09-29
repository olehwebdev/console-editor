/**
 * Firefox driven with the workspace's changes over WebDriver BiDi: launched with a profile of the app's own, a script
 * override served, a header rule and a block rule applied, a cross-origin request an override answers readable (its
 * preflight answered), changes served and the tab reloaded, a tab captured (and at a viewport given), the browser let
 * go of and reached again, and forgotten once it is quit. Runs where Firefox is found: `FIREFOX_PATH`, or `firefox` on
 * the PATH.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DrivenBrowsers, type FoundBrowser } from '../../src/main/browsers';
import { readBidiPort } from '../../src/main/browsers/driven/firefox/readBidiPort';
import type { InterceptionSources } from '../../src/main/browsers/driven/types';
import { BidiConnection } from '../../src/main/engine/bidi';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type AppEvent, type DrivenTab, type Override, type Rule, type Settings } from '../../src/shared/types';
import { decodePng } from '../helpers/decodePng';
import { encodePng } from '../helpers/encodePng';
import { killMatching } from '../helpers/killMatching';

const firefox = (() => {
  if (process.env.FIREFOX_PATH) return existsSync(process.env.FIREFOX_PATH) ? process.env.FIREFOX_PATH : null;
  try {
    return execFileSync('which', ['firefox'], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
})();

async function waitFor<T>(fn: () => T | undefined | false | Promise<T | undefined | false>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 200));
  }
}

describe.skipIf(!firefox)('Firefox driven with your changes', () => {
  let server: Server;
  let origin: string;
  let other: string;
  let userData: string;
  let driven: DrivenBrowsers;
  const events: AppEvent[] = [];
  const overrides: Override[] = [];
  const rules: Rule[] = [];
  const settings: Settings = { ...DEFAULT_SETTINGS, autoReloadOnSave: true };
  const sources = { store: { list: () => overrides, base: async () => '' }, rules: { list: () => rules }, settings: { get: () => settings } } as unknown as InterceptionSources;
  const browser: FoundBrowser = { id: 'desktop:firefox.desktop', name: 'Firefox', engine: 'gecko', command: [firefox ?? 'firefox', '--headless'], urlAt: 2, iconFile: null, app: null, program: firefox, added: false };
  const profile = () => join(userData, 'browsers', 'desktop_firefox.desktop');
  const tabs = async (): Promise<DrivenTab[]> => (await driven.read())[0]?.tabs ?? [];
  const now = Date.now();
  const override = (sourceUrl: string, kind: Override['kind'], content: string, extra: Partial<Override> = {}): Override => ({ id: `o${overrides.length}`, kind, sourceUrl, match: defaultMatcherFor(sourceUrl), content, enabled: true, originalHash: null, createdAt: now, updatedAt: now, ...extra });

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      const script = `Promise.all([fetch('/api').then((r) => r.headers.get('x-rule')), fetch('/blocked.js').then(() => 'loaded', () => 'blocked'), fetch('${other}/data', { method: 'PUT' }).then((r) => r.text(), () => 'refused')]).then((all) => { document.title = [window.appValue, ...all].join(' '); });`;
      const files: Record<string, [string, string]> = {
        '/page.html': ['text/html', `<!doctype html><title>upstream</title><body style="margin:0;background:#ff0000"><script src="/app.js"></script><script>${script}</script></body>`],
        '/design.html': ['text/html', `<!doctype html><title>-</title><body style="margin:0;background:#0000ff"><script>setInterval(() => { const c = document.getElementById('__console-editor-overlay'); document.title = (c ? 'design ' + getComputedStyle(c).opacity : 'no design') + ' ' + innerWidth; }, 100);</script></body>`],
        '/app.js': ['text/javascript', "window.appValue = 'upstream';"],
        '/api': ['application/json', '{}'],
        '/blocked.js': ['text/javascript', ''],
      };
      const file = files[path];
      if (!file) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': file[0] }).end(file[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as AddressInfo;
    origin = `http://127.0.0.1:${port}`;
    // Another origin (a CORS request), whose server never answers `/data`: only the override does.
    other = `http://localhost:${port}`;
    userData = await mkdtemp(join(tmpdir(), 'console-editor-firefox-'));
    overrides.push(override(`${origin}/app.js`, 'Script', "window.appValue = 'overridden';"), override(`${other}/data`, 'Fetch', 'from-override', { request: { method: 'PUT', operation: '' }, response: { status: 200, delayMs: 0, headers: [], send: false, patch: false } }));
    const rule = { enabled: true, resourceTypes: [], createdAt: now, updatedAt: now };
    rules.push({ ...rule, id: 'r1', action: 'headers', match: defaultMatcherFor(`${origin}/api`), headers: [{ operation: 'set', name: 'x-rule', value: 'yes' }] }, { ...rule, id: 'r2', action: 'block', match: defaultMatcherFor(`${origin}/blocked.js`) });
    driven = new DrivenBrowsers({ registry: { get: async () => browser }, sources, userData, send: (event) => events.push(event) });
  });

  afterAll(async () => {
    driven?.dispose();
    // Firefox outlives the app by design: quit it through its own port.
    const address = userData ? await readBidiPort(profile()) : null;
    const connection = address ? await BidiConnection.open(address).catch(() => null) : null;
    await connection?.send('session.new', { capabilities: {} }).catch(() => undefined);
    await connection?.send('browser.close').catch(() => undefined);
    connection?.close();
    await new Promise((r) => server?.close(r));
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it('launches it with a profile of its own, serving the overrides and applying the rules', async () => {
    await driven.open(browser.id, `${origin}/page.html`);
    await waitFor(async () => (await tabs()).some((t) => t.title === 'overridden yes blocked from-override'));
    expect(driven.list()).toEqual([{ id: browser.id, name: 'Firefox', version: expect.stringMatching(/^\d+\./), tabs: [expect.objectContaining({ url: `${origin}/page.html` })] }]);
    expect(existsSync(join(profile(), 'WebDriverBiDiServer.json'))).toBe(true);
    expect(readFileSync(join(profile(), 'user.js'), 'utf8')).toContain('browser.shell.checkDefaultBrowser');
  });

  it('serves overrides as they change, reloading its tabs when the settings say so', async () => {
    overrides[0] = { ...overrides[0], content: "window.appValue = 'changed';", updatedAt: Date.now() };
    driven.onAppEvent({ type: 'overrides-changed', overrides: [] });
    await waitFor(async () => (await tabs()).some((t) => t.title.startsWith('changed yes blocked')));
  });

  it('captures a tab, and the whole page at a viewport given', async () => {
    const [tab] = await tabs();
    const { image, browser: taken } = await driven.capture(browser.id, tab.id, 'viewport');
    expect(taken).toMatchObject({ id: browser.id, name: 'Firefox' });
    expect(decodePng(image.bytes).at(5, 5)).toEqual([255, 0, 0, 255]);
    const [capture] = await driven.captureAt(`${origin}/page.html`, { width: 400, height: 300, scale: 2 });
    if ('reason' in capture) throw new Error(capture.reason);
    expect(capture.image).toMatchObject({ width: 800, height: 600, scale: 2, viewport: { width: 400, height: 300 } });
    expect(await tabs()).toHaveLength(1);
  });

  it('lets go of it (it stays open), and reaches it again rather than launching another', async () => {
    const port = readFileSync(join(profile(), 'WebDriverBiDiServer.json'), 'utf8');
    driven.stop(browser.id);
    expect(driven.list()).toEqual([]);
    await driven.open(browser.id, `${origin}/page.html?again`);
    expect(readFileSync(join(profile(), 'WebDriverBiDiServer.json'), 'utf8')).toBe(port);
    await waitFor(async () => (await tabs()).some((t) => t.url.endsWith('?again') && t.title.startsWith('changed')));
  });

  it('lays the design over its tabs at its width, keeps it after a reload and out of captures, and takes it off', async () => {
    const title = async () => (await driven.read())[0]?.tabs.find((t) => t.url === `${origin}/design.html`)?.title ?? '';
    await driven.open(browser.id, `${origin}/design.html`);
    const settings = { opacity: 0.5, blend: 'normal', invert: false, x: 0, y: 0, attached: 'page', hidden: false, fitWidth: true } as const;
    const design = { key: 'd1', base64: encodePng(40, 30, () => [255, 0, 0]).toString('base64'), width: 300, height: 200, settings };
    await driven.setDesign(design);
    await waitFor(async () => (await title()) === 'design 0.5 300');
    await driven.setDesign({ ...design, settings: { ...settings, opacity: 1 } });
    await waitFor(async () => (await title()) === 'design 1 300');
    // Captured without it, at the window's own width.
    const tab = (await driven.read())[0].tabs.find((t) => t.url === `${origin}/design.html`)!;
    const { image } = await driven.capture(browser.id, tab.id, 'viewport');
    expect(decodePng(image.bytes).at(5, 5)).toEqual([0, 0, 255, 255]);
    expect(image.viewport.width).not.toBe(300);
    await waitFor(async () => (await title()) === 'design 1 300');
    // A new document gets it too.
    driven.onAppEvent({ type: 'overrides-changed', overrides: [] });
    await waitFor(async () => (await title()) === '-');
    await waitFor(async () => (await title()) === 'design 1 300');
    await driven.setDesign(null);
    await waitFor(async () => /^no design \d+$/.test(await title()) && !(await title()).endsWith(' 300'));
  });

  it('forgets it once it is quit', async () => {
    killMatching(profile());
    await waitFor(() => driven.list().length === 0);
    expect(events.at(-1)).toEqual({ type: 'driven-browsers-changed', driven: [] });
  });
});
