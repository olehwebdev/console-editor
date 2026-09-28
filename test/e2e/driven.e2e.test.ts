/**
 * A Chromium browser driven with the workspace's changes, in the built app on Linux: a real Chromium installed as a
 * launcher is offered "with your changes" in the browser menu; the page opens there served the workspace's override,
 * its tab is listed under the browser and captured into the shots, the page is captured here and there at once and
 * the two compared, and letting go of it takes it off the menu.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readActivePort } from '../../src/main/browsers/driven/readActivePort';
import { CdpConnection } from '../../src/main/engine/websocketTransport';
import type { DrivenBrowser, Shot } from '../../src/shared/types';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
const chromiumPath = (() => {
  try {
    return existsSync(chromium.executablePath()) ? chromium.executablePath() : null;
  } catch {
    return null;
  }
})();
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const EDITOR_URL = /\/renderer\/index\.html$/;
const BROWSER_ID = 'desktop:test-chromium.desktop';

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

describe.skipIf(!built || !chromiumPath || process.platform !== 'linux')('A browser with your changes', () => {
  let server: Server;
  let origin: string;
  let dir: string;
  let app: ElectronApplication;
  let win: Page;

  type Api = { consoleEditor: { listDriven(): Promise<DrivenBrowser[]>; listShots(): Promise<Shot[]>; createOverride(input: object): Promise<unknown> } };
  const driven = () => win.evaluate(() => (window as unknown as Api).consoleEditor.listDriven());
  const shots = () => win.evaluate(() => (window as unknown as Api).consoleEditor.listShots());
  const menu = () => win.getByTestId('browser-menu');

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
    dir = await mkdtemp(join(tmpdir(), 'console-editor-e2e-driven-'));
    mkdirSync(join(dir, 'data/applications'), { recursive: true });
    mkdirSync(join(dir, 'system'), { recursive: true });
    // Headless, so the test needs no screen of its own for it.
    writeFileSync(join(dir, 'data/applications/test-chromium.desktop'), `[Desktop Entry]\nType=Application\nName=Test Chromium\nExec=${chromiumPath} --headless=new ${sandboxArgs.join(' ')} %u\nCategories=Network;WebBrowser;\n`);

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
    // The browser outlives the app by design: quit it through its own port (first: Playwright waits for everything
    // the app started to be gone before it takes the app for closed).
    const address = dir ? await readActivePort(join(dir, 'user-data/browsers/desktop_test-chromium.desktop')) : null;
    const connection = address ? await CdpConnection.connect(address).catch(() => null) : null;
    await connection?.send('Browser.close').catch(() => undefined);
    connection?.close();
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  it('opens the page in a Chromium browser with your changes, and lists its tab under it', async () => {
    await win.getByTestId('browser-menu-button').click();
    const row = menu().locator(`[data-testid="browser-row"][data-browser-id="${BROWSER_ID}"]`);
    await row.getByTestId('browser-open-with-changes').click();
    // Served the override: the title its script sets.
    await expect.poll(async () => (await driven())[0]?.tabs.map((t) => t.title), { timeout: 30_000 }).toEqual(['overridden']);
    expect((await driven())[0]).toMatchObject({ id: BROWSER_ID, name: 'Test Chromium', version: expect.stringMatching(/^\d+\./) });

    await win.getByTestId('browser-menu-button').click();
    await expect.poll(() => row.getByTestId('browser-driven').count()).toBe(1);
    const tab = menu().getByTestId('driven-tab');
    await expect.poll(() => tab.innerText()).toContain('overridden');
    expect(await tab.innerText()).toContain(`${origin}/page.html`);
    await menu().getByRole('textbox', { name: 'Search browsers' }).fill('nothing like it');
    await menu().getByText('No tab matches.').waitFor();
    await menu().getByRole('textbox', { name: 'Search browsers' }).fill('');
  });

  it("captures its tab into the shots, with the browser's name", async () => {
    await menu().getByTestId('driven-tab-capture').click();
    await expect.poll(async () => (await shots()).length, { timeout: 15_000 }).toBe(1);
    const [shot] = await shots();
    expect(shot).toMatchObject({ kind: 'capture', area: 'viewport', pageUrl: `${origin}/page.html`, browser: { id: BROWSER_ID, name: 'Test Chromium' } });
  });

  it('captures the page here and in the browser at once, as a group, and compares them', async () => {
    await win.keyboard.press('Escape');
    await expect.poll(() => menu().count()).toBe(0);
    await win.getByTestId('shots-menu-button').click();
    await win.getByTestId('shots-capture').click();
    await win.getByRole('menuitem', { name: 'In every browser' }).click();
    await expect.poll(async () => (await shots()).filter((s) => s.group).length, { timeout: 30_000 }).toBe(2);
    // Newest first: the app's capture was taken first.
    const [other, own] = (await shots()).filter((s) => s.group);
    expect(own).toMatchObject({ kind: 'capture', area: 'page', pageUrl: `${origin}/page.html`, browser: { id: 'app' } });
    expect(other).toMatchObject({ area: 'page', pageUrl: `${origin}/page.html`, group: own.group, browser: { id: BROWSER_ID }, viewport: own.viewport, scale: own.scale, width: own.width });

    await win.getByRole('button', { name: 'Compare', exact: true }).click();
    await win.getByTestId('group-page').waitFor();
    await expect.poll(() => win.getByTestId('group-cell').count()).toBe(2);
    expect(await win.getByTestId('group-cell').first().getAttribute('data-shot-id')).toBe(own.id);
    await expect.poll(() => win.getByTestId('group-share').innerText(), { timeout: 20_000 }).toMatch(/% differ$/);
    expect(await win.getByTestId('group-baseline').innerText()).toContain('This app');
    await win.getByRole('tab', { name: 'Differences' }).click();
    await expect.poll(() => win.getByTestId('group-cell').locator('canvas').count()).toBe(1);
  });

  it('lets go of it, taking it off the menu', async () => {
    await win.getByTestId('browser-menu-button').click();
    await menu().getByRole('button', { name: 'Stop serving your changes in Test Chromium' }).click();
    await expect.poll(() => driven()).toEqual([]);
    await expect.poll(() => menu().getByTestId('driven-browsers').count()).toBe(0);
  });
});
