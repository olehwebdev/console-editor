/**
 * The Actions panel in a window of its own, in the built app, on the fixture's
 * services page (cart's `addItem(sku)` makes billing log what it got): moving
 * it there and back (its button, the sidebar's notice, the View menu, closing
 * it), running and making actions from it, Keep on top, the settings and the
 * workspace following it, and where it was surviving a restart.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

/** The editor's window, and the Actions panel's own, by the end of their URL. */
const EDITOR_URL = /\/renderer\/index\.html$/;
const ACTIONS_WINDOW_URL = /\/renderer\/index\.html#actions-window$/;

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
  const app = await electron.launch({
    args: [...sandboxArgs, root],
    cwd: root,
    env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string>,
  });
  const win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
  await win.waitForSelector('body[data-ready]');
  return { app, win };
}

/** The Actions window's UI, once it is ready. */
async function actionsWindow(app: ElectronApplication): Promise<Page> {
  const found = await waitFor(() => app.windows().find((p) => ACTIONS_WINDOW_URL.test(p.url()) && !p.isClosed()));
  await found.waitForSelector('body[data-ready]');
  return found;
}

/** The app's windows by title: how many, and which stay on top. */
const windows = (app: ElectronApplication) =>
  app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => ({ title: w.getTitle(), onTop: w.isAlwaysOnTop() })));

/** The View menu's Actions item: its check mark, or a click on it. */
const menu = (app: ElectronApplication, action: 'click' | 'checked') =>
  app.evaluate(({ Menu }, what) => {
    const item = Menu.getApplicationMenu()!.getMenuItemById('actions-window')!;
    if (what === 'click') item.click();
    return item.checked;
  }, action);

/** How many rows the page logged (not code you ran) say `words`. */
const logged = (win: Page, words: string) =>
  win.$$eval('[data-testid=console-row][data-source=console]', (els, w) => els.filter((el) => (el as unknown as { innerText: string }).innerText.includes(w)).length, words);

const row = (page: Page, name: string) => page.getByTestId('action-row').filter({ hasText: name });

/** Makes an action with the form of `page`'s panel. */
async function makeAction(page: Page, name: string, frame: string, code: string): Promise<void> {
  await page.getByTestId('action-new').click();
  await page.getByTestId('action-name').fill(name);
  await page.getByTestId('action-target').click();
  await page.getByRole('menuitemcheckbox', { name: frame }).click();
  await page.getByTestId('action-code').fill(code);
  await page.getByTestId('action-code').press('Control+Enter');
  await expect.poll(() => row(page, name).count()).toBe(1);
}

describe.skipIf(!built)('The Actions panel in a window of its own', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-actions-window-'));
    ({ app, win } = await launch(userData));
    const bar = win.getByTestId('address-bar');
    await bar.fill(`${site.url}/services.html`);
    await bar.press('Enter');
    await win.getByTestId('console-toggle').click();
    await win.getByTestId('rail-actions').click();
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true });
  });

  it('moves the panel into its own window, and runs actions from there in their frame', async () => {
    await makeAction(win, 'Add A1', 'cart', "addItem('A1')");
    await win.getByTestId('actions-move').click();
    const panel = await actionsWindow(app);
    await expect.poll(async () => (await windows(app)).map((w) => w.title).sort()).toEqual(['Actions', 'Console Editor']);
    expect(await menu(app, 'checked')).toBe(true);
    // The sidebar says where the actions went instead of listing them.
    await win.getByTestId('actions-detached').waitFor();
    expect(await win.getByTestId('action-row').count()).toBe(0);

    await row(panel, 'Add A1').getByTestId('action-run').click();
    await expect.poll(() => logged(win, 'billing got'), { timeout: 20_000 }).toBe(1);
    await expect.poll(() => row(panel, 'Add A1').getByTestId('action-result').innerText()).toBe('undefined');
  });

  it('makes actions in the window, and follows the workspace shown', async () => {
    const panel = await actionsWindow(app);
    await makeAction(panel, 'Pay', 'billing', "console.log('card charged')");
    await row(panel, 'Pay').getByTestId('action-run').click();
    await expect.poll(() => logged(win, 'card charged'), { timeout: 20_000 }).toBe(1);

    // Another workspace has actions of its own: the window shows them, then this one's again.
    const tiles = () => win.getByTestId('workspace-tile');
    await win.getByTestId('workspace-new').click();
    await expect.poll(() => tiles().nth(1).getAttribute('aria-current')).toBe('true');
    await expect.poll(() => panel.getByTestId('action-row').count()).toBe(0);
    await tiles().first().click();
    await expect.poll(() => tiles().first().getAttribute('aria-current')).toBe('true');
    await expect.poll(() => panel.getByTestId('action-row').count()).toBe(2);
  });

  it('shows the settings as either window changes them', async () => {
    const panel = await actionsWindow(app);
    await win.getByTestId('rail-settings').click();
    const recording = win.getByRole('switch', { name: 'Record the console' });
    await recording.click();
    await expect.poll(() => recording.getAttribute('aria-checked')).toBe('false');
    // The window says why nothing can run, and turns it back on from there.
    await panel.getByRole('button', { name: 'Turn it on' }).click();
    await expect.poll(() => recording.getAttribute('aria-checked')).toBe('true');
    await expect.poll(() => panel.getByRole('button', { name: 'Turn it on' }).count()).toBe(0);
    await win.getByTestId('rail-actions').click();
  });

  it('keeps the window on top when asked, and opens it where it was after a restart', async () => {
    const panel = await actionsWindow(app);
    await panel.getByTestId('actions-on-top').click();
    await expect.poll(async () => (await windows(app)).find((w) => w.title === 'Actions')?.onTop).toBe(true);
    await expect.poll(() => panel.getByTestId('actions-on-top').getAttribute('aria-pressed')).toBe('true');

    await app.close();
    ({ app, win } = await launch(userData));
    const reopened = await actionsWindow(app);
    await expect.poll(() => reopened.getByTestId('action-row').count(), { timeout: 20_000 }).toBe(2);
    await expect.poll(async () => (await windows(app)).find((w) => w.title === 'Actions')?.onTop).toBe(true);
    await win.getByTestId('actions-detached').waitFor();
  });

  it('puts the panel back in the sidebar when its window closes, from the notice, and from the View menu', async () => {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().endsWith('#actions-window'))!.close());
    await expect.poll(async () => (await windows(app)).length).toBe(1);
    await expect.poll(() => win.getByTestId('action-row').count()).toBe(2);
    expect(await menu(app, 'checked')).toBe(false);

    await menu(app, 'click');
    await actionsWindow(app);
    await win.getByTestId('actions-detached').waitFor();
    await win.getByRole('button', { name: 'Put them back here' }).click();
    await expect.poll(async () => (await windows(app)).length).toBe(1);
    await expect.poll(() => win.getByTestId('action-row').count()).toBe(2);

    await menu(app, 'click');
    await actionsWindow(app);
    await menu(app, 'click');
    await expect.poll(async () => (await windows(app)).length).toBe(1);
    await expect.poll(() => menu(app, 'checked')).toBe(false);
  });
});
