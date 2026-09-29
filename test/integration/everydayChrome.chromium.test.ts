/**
 * Your everyday Chromium browser, remote debugging turned on for it (Chrome 144's chrome://inspect/#remote-debugging):
 * found through the address it writes in its everyday profile, listed as debuggable while it runs, driven without a
 * launch, only in the tab the app opens (served the overrides), your own tab left alone, and let go of as it was. A
 * Chromium started on a stand-in everyday profile with a debugging port plays the part.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BrowserRegistry, DrivenBrowsers, type FoundBrowser } from '../../src/main/browsers';
import { readActivePort } from '../../src/main/browsers/driven/chromium/readActivePort';
import { reachableEveryday } from '../../src/main/browsers/driven/everyday/reachableEveryday';
import type { InterceptionSources } from '../../src/main/browsers/driven/types';
import { CdpConnection } from '../../src/main/engine/websocketTransport';
import { BrowserStore } from '../../src/main/store/BrowserStore';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type AppEvent, type Override } from '../../src/shared/types';
import { chromiumAvailable } from '../helpers/chromium';

async function waitFor<T>(fn: () => T | undefined | false | Promise<T | undefined | false>, timeout = 20_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe.skipIf(!chromiumAvailable)('your everyday Chromium browser, remote debugging on', () => {
  let server: Server;
  let origin: string;
  let home: string;
  let profile: string;
  let everyday: ChildProcess;
  let driven: DrivenBrowsers;
  const events: AppEvent[] = [];
  const overrides: Override[] = [];
  const sources = { store: { list: () => overrides, base: async () => '' }, rules: { list: () => [] }, settings: { get: () => DEFAULT_SETTINGS } } as unknown as InterceptionSources;
  const browser: FoundBrowser = { id: 'desktop:google-chrome.desktop', name: 'Google Chrome', engine: 'chromium', command: ['/usr/bin/google-chrome-stable'], urlAt: 1, iconFile: null, app: null, program: '/usr/bin/google-chrome-stable', added: false };
  /** The page targets the browser has, as its own debugging port lists them. */
  const pages = async () => {
    const connection = await CdpConnection.connect((await readActivePort(profile))!);
    const { targetInfos } = await connection.send<{ targetInfos: Array<{ type: string; url: string; attached: boolean }> }>('Target.getTargets');
    connection.close();
    return targetInfos.filter((t) => t.type === 'page');
  };

  beforeAll(async () => {
    server = createServer((req, res) => {
      const files: Record<string, [string, string]> = {
        '/page.html': ['text/html', '<!doctype html><title>upstream</title><script src="/app.js"></script>'],
        '/app.js': ['text/javascript', "document.title = 'upstream';"],
      };
      const file = files[new URL(req.url ?? '/', 'http://x').pathname];
      if (!file) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': file[0] }).end(file[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    home = await mkdtemp(join(tmpdir(), 'console-editor-everyday-chrome-'));
    profile = join(home, '.config/google-chrome');
    mkdirSync(profile, { recursive: true });
    const now = Date.now();
    overrides.push({ id: 'o1', kind: 'Script', sourceUrl: `${origin}/app.js`, match: defaultMatcherFor(`${origin}/app.js`), content: "document.title = 'overridden';", enabled: true, originalHash: null, createdAt: now, updatedAt: now });
    // "Your" Chrome: its everyday profile, remote debugging on, one tab of your own open.
    const sandbox = process.getuid?.() === 0 ? ['--no-sandbox'] : [];
    everyday = spawn(chromium.executablePath(), ['--headless=new', ...sandbox, `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', `${origin}/page.html?mine`], { stdio: 'ignore' });
    await waitFor(() => readActivePort(profile));
    driven = new DrivenBrowsers({ registry: { get: async () => browser }, sources, userData: join(home, 'user-data'), home, send: (event) => events.push(event) });
  });

  afterAll(async () => {
    driven?.dispose();
    everyday?.kill();
    await new Promise((r) => server?.close(r));
    await rm(home, { recursive: true, force: true, maxRetries: 5 });
  });

  it('is found through the address it wrote in its everyday profile, and listed as debuggable while it runs', async () => {
    expect(await reachableEveryday(browser, home, 'linux')).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\//);
    const prefs = new BrowserStore(join(home, 'browsers.json'));
    await prefs.load();
    const registry = new BrowserRegistry({ prefs, send: () => undefined, find: async () => [browser], home });
    expect((await registry.list())[0]).toMatchObject({ id: browser.id, debuggable: true });
  });

  it('opens the page in a tab of its own there, served the overrides, and leaves your own tab alone', async () => {
    await driven.open(browser.id, `${origin}/page.html`, true);
    await waitFor(async () => (await driven.read())[0]?.tabs.some((t) => t.title === 'overridden'));
    expect(driven.list()).toEqual([{ id: `${browser.id}#everyday`, browserId: browser.id, everyday: true, name: 'Google Chrome · your profile', version: expect.stringMatching(/^\d+\./), tabs: [expect.objectContaining({ url: `${origin}/page.html`, title: 'overridden' })] }]);
    // Your own tab isn't listed, attached or served: it still shows the page as the server sent it.
    const mine = (await pages()).find((p) => p.url.endsWith('?mine'))!;
    expect(mine.attached).toBe(false);
  });

  it('is let go of as it was: the browser still runs, your tab still open', async () => {
    driven.stop(`${browser.id}#everyday`);
    expect(driven.list()).toEqual([]);
    expect((await pages()).some((p) => p.url.endsWith('?mine'))).toBe(true);
    expect(await reachableEveryday(browser, home, 'linux')).not.toBeNull();
  });

  it("isn't found once it has quit, although its profile keeps the address", async () => {
    const exited = new Promise((r) => everyday.once('exit', r));
    everyday.kill();
    await exited;
    expect(await readActivePort(profile)).not.toBeNull();
    expect(await reachableEveryday(browser, home, 'linux')).toBeNull();
    await expect(driven.open(browser.id, `${origin}/page.html`, true)).rejects.toThrow('Turn on remote debugging in Google Chrome first');
  });
});
