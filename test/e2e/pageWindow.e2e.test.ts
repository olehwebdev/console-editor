/**
 * The website in a window of its own (to put on another screen), in the built
 * app: moving it there and back, from both windows' toolbars, the menu and by
 * closing its window; the page keeps running and its overrides keep applying;
 * where the window was, and that it was open, survive a restart; the site's
 * pop-ups go along; moves and focus requests made while the window loads.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

/** The editor's window, and the website's own, by the end of their URL. */
const EDITOR_URL = /\/renderer\/index\.html$/;
const PAGE_WINDOW_URL = /\/renderer\/index\.html#page-window$/;

/** Polls until `fn` returns a truthy value (usable outside tests, unlike expect.poll). */
async function waitFor<T>(fn: () => T | undefined, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function launch(userData: string): Promise<{ app: ElectronApplication; win: Page }> {
  // No executablePath: Playwright then injects its loader, which Electron apps need.
  const app = await electron.launch({
    args: [...sandboxArgs, root],
    cwd: root,
    env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string>,
  });
  const win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
  await win.waitForSelector('body[data-ready]');
  return { app, win };
}

/** The website's own window's UI, once it is ready. */
async function pageWindow(app: ElectronApplication): Promise<Page> {
  const found = await waitFor(() => app.windows().find((p) => PAGE_WINDOW_URL.test(p.url()) && !p.isClosed()));
  await found.waitForSelector('body[data-ready]');
  return found;
}

/**
 * Clicks the website window's button that puts the website back, which closes that window. Main destroys it
 * as the click lands, and Playwright's click, still waiting on the page, can then reject though it did its job:
 * the rejection counts only if the window is still open. The callers check where the website went.
 */
async function putBack(own: Page): Promise<void> {
  await own
    .getByRole('button', { name: 'Put back in the editor window' })
    .click()
    .catch((err: unknown) => {
      if (!own.isClosed()) throw err;
    });
}

/** Which window shows the site's view (by its UI's location hash, '' for the editor), with the view's and the window's bounds. */
function viewHost(app: ElectronApplication, siteUrl: string) {
  return app.evaluate(({ BrowserWindow, WebContentsView }, url) => {
    for (const w of BrowserWindow.getAllWindows()) {
      const view = w.contentView.children.find((v) => v instanceof WebContentsView && v.webContents.getURL().startsWith(url));
      if (view) return { hash: new URL(w.webContents.getURL()).hash, view: view.getBounds(), window: w.getBounds() };
    }
    return null;
  }, siteUrl);
}

async function typeAtEndOfEditor(win: Page, text: string): Promise<void> {
  await win.click('.monaco-editor .view-lines');
  await win.keyboard.press('Control+End');
  await win.keyboard.press('Enter');
  await win.keyboard.type(text);
  await win.keyboard.press('Escape');
}

async function goTo(win: Page, url: string): Promise<void> {
  const bar = win.getByTestId('address-bar');
  await bar.fill(url);
  await bar.press('Enter');
}

describe.skipIf(!built)('The website in a window of its own', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  const inSite = (expr: string) =>
    app
      .evaluate(({ webContents }, [siteUrl, code]) => {
        const wc = webContents.getAllWebContents().find((w) => w.getURL().startsWith(siteUrl));
        return wc ? Promise.race([wc.mainFrame.executeJavaScript(code), new Promise((r) => setTimeout(r, 500, undefined))]) : undefined;
      }, [site.url, expr] as const)
      .catch(() => undefined);
  const host = () => viewHost(app, site.url);
  const openWindows = () => app.windows().filter((p) => PAGE_WINDOW_URL.test(p.url()) && !p.isClosed()).length;
  const savedPlacement = async () => JSON.parse(await readFile(join(userData, 'page-window.json'), 'utf8')) as { detached: boolean; bounds?: { x: number; y: number; width: number; height: number } };

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-page-window-'));
    ({ app, win } = await launch(userData));
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it("opens from the preview's toolbar, with the page still running as it was", async () => {
    await goTo(win, site.url);
    await expect.poll(() => inSite('window.appValue')).toBe('original');
    await inSite('window.marker = 42');

    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Open in its own window' }).click();
    const own = await pageWindow(app);
    await expect.poll(async () => (await host())?.hash).toBe('#page-window');
    // Its UI placed the page under its toolbar, across the window.
    await expect.poll(async () => (await host())?.view.width).toBeGreaterThan(400);
    // Not reloaded: moved.
    expect(await inSite('window.marker')).toBe(42);
    expect(await own.getByTestId('address-bar').inputValue()).toBe(`${site.url}/`);
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => w.getTitle()))).toContain(await inSite('document.title'));

    // The editor gives the preview's room to the editor.
    await expect.poll(() => win.getByRole('region', { name: 'Website preview' }).count()).toBe(0);
    await expect(win.getByRole('button', { name: 'Show website preview' }).isVisible()).resolves.toBe(true);
  });

  it('serves the edits saved in the editor to the website in its own window', async () => {
    await win.locator(`[data-testid="resource-row"][data-url="${site.url}/app.js"]`).click();
    await win.locator('.monaco-editor .view-lines', { hasText: 'window.appValue' }).waitFor();
    await typeAtEndOfEditor(win, 'window.patchedByEditor = true;');
    await win.keyboard.press('Control+S');
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
    expect((await host())?.hash).toBe('#page-window');
  });

  it('navigates from its own toolbar', async () => {
    const own = await pageWindow(app);
    await goTo(own, `${site.url}/frames.html`);
    await expect.poll(() => inSite('location.pathname')).toBe('/frames.html');
    // Exact: "Put back in the editor window" holds the word too.
    const back = own.getByRole('button', { name: 'Back', exact: true });
    await expect.poll(() => back.isEnabled()).toBe(true);
    await back.click();
    await expect.poll(() => inSite('location.pathname')).toBe('/');
  });

  it("goes back into the editor from its toolbar's button", async () => {
    const own = await pageWindow(app);
    await inSite('window.marker = 43');
    await putBack(own);
    await expect.poll(openWindows).toBe(0);
    await expect.poll(async () => (await host())?.hash).toBe('');
    await expect.poll(async () => (await host())?.view.width).toBeGreaterThan(0);
    expect(await inSite('window.marker')).toBe(43);
    await expect.poll(() => win.getByRole('region', { name: 'Website preview' }).count()).toBe(1);
    // Written in the background: it lands shortly after.
    await expect.poll(async () => (await savedPlacement()).detached).toBe(false);
  });

  it('goes back when its window is closed, and opens again where that window was', async () => {
    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Open in its own window' }).click();
    await pageWindow(app);
    const moved = { x: 40, y: 50, width: 900, height: 700 };
    await app.evaluate(({ BrowserWindow }, bounds) => {
      BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().endsWith('#page-window'))!.setBounds(bounds);
    }, moved);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().endsWith('#page-window'))!.close());
    await expect.poll(openWindows).toBe(0);
    await expect.poll(async () => (await host())?.hash).toBe('');
    await expect.poll(async () => (await savedPlacement()).bounds).toEqual(moved);

    // Back in the editor: the title bar's button just hides and shows the preview.
    await expect.poll(() => win.getByRole('region', { name: 'Website preview' }).count()).toBe(1);
    await win.getByRole('button', { name: 'Hide website preview' }).click();
    await expect.poll(() => win.getByRole('region', { name: 'Website preview' }).count()).toBe(0);
    expect(openWindows()).toBe(0);
    await win.getByRole('button', { name: 'Show website preview' }).click();
    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Open in its own window' }).click();
    await pageWindow(app);
    await expect.poll(async () => (await host())?.window).toEqual(moved);
  });

  it("brings it back from the editor's title bar, and the View menu moves it either way", async () => {
    await win.getByRole('button', { name: 'Show website preview' }).click();
    await expect.poll(openWindows).toBe(0);
    await expect.poll(async () => (await host())?.hash).toBe('');

    const menu = (action: 'click' | 'checked') =>
      app.evaluate(({ Menu }, what) => {
        const item = Menu.getApplicationMenu()!.getMenuItemById('page-window')!;
        if (what === 'click') item.click();
        return item.checked;
      }, action);
    // Out while the editor's preview was hidden: back, the preview shows it.
    await win.getByRole('button', { name: 'Hide website preview' }).click();
    await expect.poll(() => win.getByRole('region', { name: 'Website preview' }).count()).toBe(0);
    await menu('click');
    await pageWindow(app);
    await expect.poll(() => menu('checked')).toBe(true);
    await menu('click');
    await expect.poll(openWindows).toBe(0);
    await expect.poll(() => menu('checked')).toBe(false);
    await expect.poll(() => win.getByRole('region', { name: 'Website preview' }).count()).toBe(1);
    await expect.poll(async () => (await host())?.view.width).toBeGreaterThan(0);
  });

  it("keeps the site's pop-ups open, going along with it", async () => {
    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Open in its own window' }).click();
    await pageWindow(app);
    // A sign-in pop-up: a window of its own, over the window showing the site.
    await inSite(`void window.open('${site.url}/frames.html?popup', 'signin', 'popup,width=400,height=300')`);
    const popupParent = () =>
      app.evaluate(({ BrowserWindow }, url) => {
        const popup = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL() === url);
        return popup ? (popup.getParentWindow()?.webContents.getURL() ?? null) : undefined;
      }, `${site.url}/frames.html?popup`);
    await expect.poll(popupParent).toMatch(PAGE_WINDOW_URL);

    await putBack(await pageWindow(app));
    await expect.poll(openWindows).toBe(0);
    await expect.poll(popupParent).toMatch(EDITOR_URL);
    await app.evaluate(({ BrowserWindow }, url) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL() === url)?.close(), `${site.url}/frames.html?popup`);
    await expect.poll(popupParent).toBeUndefined();
  });

  it('copes with being put back, or asked for its address bar, while its window still loads', async () => {
    await app.evaluate(() => {
      const failures: string[] = [];
      (globalThis as { failures?: string[] }).failures = failures;
      process.on('unhandledRejection', (reason) => failures.push(String(reason)));
    });
    const clickMenu = (labels: string[]) =>
      app.evaluate(({ Menu }, wanted) => {
        const items = Menu.getApplicationMenu()!.items.flatMap((menu) => menu.submenu?.items ?? []);
        for (const label of wanted) items.find((item) => item.label === label)!.click();
      }, labels);

    // Out and straight back, before its UI has loaded.
    await clickMenu(['Website in Its Own Window', 'Website in Its Own Window']);
    await expect.poll(async () => (await host())?.hash).toBe('');
    await new Promise((r) => setTimeout(r, 1000));
    expect(openWindows()).toBe(0);
    expect(await app.evaluate(() => (globalThis as { failures?: string[] }).failures)).toEqual([]);

    // Out, and Ctrl/Cmd+L at once: the address bar is focused once the window's UI is there.
    await clickMenu(['Website in Its Own Window', 'Focus Address Bar']);
    const own = await pageWindow(app);
    await expect.poll(() => own.getByTestId('address-bar').evaluate((el) => el === el.ownerDocument.activeElement)).toBe(true);
    await putBack(own);
    await expect.poll(openWindows).toBe(0);
  });

  it('opens in its own window again after a restart, if it was there when the app quit', async () => {
    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Open in its own window' }).click();
    await pageWindow(app);
    // Until the old process is gone it holds the data folder's single-instance lock.
    const old = app.process();
    const oldExited = old.exitCode === null ? new Promise((done) => old.once('exit', done)) : Promise.resolve();
    await app.close();
    await oldExited;
    expect((await savedPlacement()).detached).toBe(true);

    ({ app, win } = await launch(userData));
    await pageWindow(app);
    await expect.poll(async () => (await host())?.hash, { timeout: 15_000 }).toBe('#page-window');
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => win.getByRole('region', { name: 'Website preview' }).count()).toBe(0);
  });
});
