/**
 * Firefox driven with the workspace's changes, in the built app on Linux: Firefox installed as a launcher is offered
 * "with your changes" in the browser menu; the page opens there served the workspace's override, its tab is listed,
 * and the page is captured here and there at once, as a group. Runs where Firefox is found: `FIREFOX_PATH`, or
 * `firefox` on the PATH.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DrivenBrowser, Shot } from '../../src/shared/types';
import { killMatching } from '../helpers/killMatching';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
const firefox = (() => {
  if (process.env.FIREFOX_PATH) return existsSync(process.env.FIREFOX_PATH) ? process.env.FIREFOX_PATH : null;
  try {
    return execFileSync('which', ['firefox'], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
})();
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const EDITOR_URL = /\/renderer\/index\.html$/;
const BROWSER_ID = 'desktop:test-firefox.desktop';

/** Polls until `fn` returns a truthy value (usable outside tests, unlike expect.poll). */
async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe.skipIf(!built || !firefox || process.platform !== 'linux')('Firefox with your changes', () => {
  let server: Server;
  let origin: string;
  let dir: string;
  let app: ElectronApplication;
  let win: Page;

  type Api = { consoleEditor: { listDriven(): Promise<DrivenBrowser[]>; listShots(): Promise<Shot[]>; createOverride(input: object): Promise<unknown> } };
  const driven = () => win.evaluate(() => (window as unknown as Api).consoleEditor.listDriven());
  const shots = () => win.evaluate(() => (window as unknown as Api).consoleEditor.listShots());

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
    dir = await mkdtemp(join(tmpdir(), 'console-editor-e2e-firefox-'));
    mkdirSync(join(dir, 'data/applications'), { recursive: true });
    mkdirSync(join(dir, 'system'), { recursive: true });
    // Headless, so the test needs no screen of its own for it.
    writeFileSync(join(dir, 'data/applications/test-firefox.desktop'), `[Desktop Entry]\nType=Application\nName=Firefox\nExec=${firefox} --headless %u\nCategories=Network;WebBrowser;\n`);

    app = await electron.launch({
      args: [...sandboxArgs, root],
      cwd: root,
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: join(dir, 'user-data'), XDG_DATA_HOME: join(dir, 'data'), XDG_DATA_DIRS: join(dir, 'system') } as Record<string, string>,
    });
    win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
    await win.waitForSelector('body[data-ready]');
    const bar = win.getByTestId('address-bar');
    await bar.fill(`${origin}/page.html`);
    await bar.press('Enter');
    await waitFor(() => app.evaluate(({ webContents }, o) => webContents.getAllWebContents().some((wc) => wc.getURL() === `${o}/page.html` && !wc.isLoading()), origin));
    await win.evaluate((o) => (window as unknown as Api).consoleEditor.createOverride({ kind: 'Script', sourceUrl: `${o}/app.js`, content: "document.title = 'overridden';", originalHash: null }), origin);
  });

  afterAll(async () => {
    // Firefox outlives the app by design: quit it first (Playwright waits for everything the app started to be gone).
    if (dir) killMatching(join(dir, 'user-data/browsers'));
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  it('opens the page in Firefox with your changes, and lists its tab', async () => {
    await win.getByTestId('browser-menu-button').click();
    const row = win.locator(`[data-testid="browser-row"][data-browser-id="${BROWSER_ID}"]`);
    await row.getByTestId('browser-open-with-changes').click();
    await expect.poll(async () => (await driven())[0]?.tabs.map((t) => t.title), { timeout: 30_000 }).toEqual(['overridden']);
    expect((await driven())[0]).toMatchObject({ id: BROWSER_ID, name: 'Firefox', version: expect.stringMatching(/^\d+\./) });
    await win.getByTestId('browser-menu-button').click();
    await expect.poll(() => win.getByTestId('driven-tab').innerText()).toContain('overridden');
    await win.keyboard.press('Escape');
  });

  it('captures the page here and in Firefox at once, as a group', async () => {
    await expect.poll(() => win.getByTestId('browser-menu').count()).toBe(0);
    await win.getByTestId('shots-menu-button').click();
    await win.getByTestId('shots-capture').click();
    await win.getByRole('menuitem', { name: 'In every browser' }).click();
    await expect.poll(async () => (await shots()).filter((s) => s.group).length, { timeout: 40_000 }).toBe(2);
    const [other, own] = (await shots()).filter((s) => s.group);
    expect(own).toMatchObject({ area: 'page', browser: { id: 'app' } });
    expect(other).toMatchObject({ area: 'page', pageUrl: `${origin}/page.html`, group: own.group, browser: { id: BROWSER_ID, name: 'Firefox' }, viewport: own.viewport, scale: own.scale });
  });
});
