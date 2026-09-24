/**
 * Drives the built Electron app like a user would: open a site, pick a file,
 * edit it, save, and check that the page (or an iframe in it) runs the edited
 * code.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAIN_JS_PATH, startFixtureSite, type FixtureSite } from '../fixtures/site';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));

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
    args: [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), root],
    cwd: root,
    env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string>,
  });
  // The embedded website view is also a page; pick the editor UI.
  const win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
  await win.waitForSelector('body[data-ready]');
  return { app, win };
}

/**
 * Evaluates `expr` in the website, or in the frame (at any depth, in any
 * process) whose hostname is `host`, through Electron's WebFrameMain.
 * Resolves undefined if the frame is replaced before it answers (a reload in
 * progress), so a polling caller simply tries again.
 */
function evalInSite(app: ElectronApplication, siteUrl: string, expr: string, host?: string): Promise<unknown> {
  return app
    .evaluate(
      async ({ webContents }, [siteUrl, expr, host]) => {
        const wc = webContents.getAllWebContents().find((w) => w.getURL().startsWith(siteUrl as string));
        if (!wc) return undefined;
        const frame = host ? wc.mainFrame.framesInSubtree.find((f) => f.url && new URL(f.url).hostname === host) : wc.mainFrame;
        if (!frame) return undefined;
        const gone = new Promise((resolve) => setTimeout(resolve, 2000, undefined));
        return Promise.race([frame.executeJavaScript(expr as string), gone]);
      },
      [siteUrl, expr, host] as const,
    )
    .catch(() => undefined);
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

const fileRow = (win: Page, url: string) => win.locator(`[data-testid="resource-row"][data-url="${url}"]`);

describe.skipIf(!built)('Console Editor app', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  const inSite = (expr: string, host?: string) => evalInSite(app, site.url, expr, host);

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-'));
    ({ app, win } = await launch(userData));
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it('opens a website and lists its scripts, stylesheets and document', async () => {
    await goTo(win, site.url);
    await fileRow(win, `${site.url}/app.js`).waitFor();
    await expect.poll(() => win.getByTestId('resource-row').count()).toBe(5);
    await expect.poll(() => inSite('window.appValue')).toBe('original');
  });

  it('edits a script, saves it as an override, and the reloaded page runs it', async () => {
    await fileRow(win, `${site.url}/app.js`).click();
    await win.locator('.monaco-editor .view-lines', { hasText: 'window.appValue' }).waitFor();
    await typeAtEndOfEditor(win, 'window.patchedByEditor = true;');
    await win.keyboard.press('Control+S');

    await win.locator('[data-override-id]').waitFor();
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
    // The rest of the (SRI-protected) file still runs.
    await expect.poll(() => inSite("document.querySelector('#app').textContent")).toBe('app: original');
    await expect.poll(() => win.getByTestId('override-hits').first().textContent()).toContain('1');
  });

  it('pretty-prints a minified bundle and can match every build of a hashed file', async () => {
    await fileRow(win, `${site.url}${MAIN_JS_PATH}`).click();
    // The one-line bundle was pretty-printed: its first statements now sit on their own lines.
    await win.locator('.monaco-editor .view-line', { hasText: 'version: "1.0.0",' }).waitFor();
    await expect.poll(() => win.locator('.monaco-editor .view-line').count()).toBeGreaterThan(20);

    await win.getByTestId('save-button').click();
    await win.getByRole('button', { name: /Match every build/ }).click();
    await expect.poll(() => win.getByTestId('match-type').textContent()).toContain('glob');
    await expect.poll(() => win.getByTestId('match-pattern').inputValue()).toBe(`${site.url}/static/js/main.*.js`);
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(2);
  });

  it('turning an override off brings back the live file', async () => {
    const row = win.locator('[data-override-id]', { hasText: 'app.js' });
    await row.getByRole('switch').click();
    await expect.poll(() => inSite('typeof window.patchedByEditor'), { timeout: 15_000 }).toBe('undefined');
    await expect.poll(() => inSite('window.appValue')).toBe('original');
    await row.getByRole('switch').click();
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
  });

  it('edits files inside a cross-site iframe and a nested one', async () => {
    await goTo(win, `${site.url}/frames.html`);
    const port = new URL(site.url).port;
    const widgetJs = `http://localhost:${port}/frames/widget.js`;
    await fileRow(win, widgetJs).waitFor();
    // Marked as loaded by an iframe.
    await expect.poll(() => fileRow(win, widgetJs).getAttribute('data-iframe')).toBe('');
    await expect.poll(() => inSite('window.widgetValue', 'localhost')).toBe('original-widget');

    await fileRow(win, widgetJs).click();
    await win.locator('.monaco-editor .view-lines', { hasText: 'widgetValue' }).waitFor();
    await typeAtEndOfEditor(win, 'window.patchedInIframe = true;');
    await win.keyboard.press('Control+S');
    await expect.poll(() => inSite('window.patchedInIframe', 'localhost'), { timeout: 15_000 }).toBe(true);

    const nestedJs = `http://nested.localhost:${port}/frames/nested.js`;
    await fileRow(win, nestedJs).click();
    await win.locator('.monaco-editor .view-lines', { hasText: 'nestedValue' }).waitFor();
    await typeAtEndOfEditor(win, 'window.patchedInNested = true;');
    await win.keyboard.press('Control+S');
    await expect.poll(() => inSite('window.patchedInNested', 'nested.localhost'), { timeout: 15_000 }).toBe(true);
  });

  it("keeps the page under the editor's control: guards, new tabs, permissions", async () => {
    await goTo(win, `${site.url}/guard.html`);
    await expect.poll(() => inSite('document.title')).toBe('Guarded');
    // The app answers the page's beforeunload itself; keep Playwright from trying to as well.
    app.windows().find((p) => p.url().startsWith(site.url))?.on('dialog', () => undefined);
    // beforeunload only applies once the user has interacted with the page.
    await app.evaluate(({ webContents }, url) => {
      const wc = webContents.getAllWebContents().find((w) => w.getURL().startsWith(url))!;
      wc.sendInputEvent({ type: 'mouseDown', x: 5, y: 5, button: 'left', clickCount: 1 });
      wc.sendInputEvent({ type: 'mouseUp', x: 5, y: 5, button: 'left', clickCount: 1 });
    }, site.url);
    await expect.poll(() => inSite('navigator.userActivation.hasBeenActive')).toBe(true);

    // The page's "Leave site?" guard doesn't cancel an editor reload.
    const firstLoad = await inSite('window.loadedAt');
    await win.getByRole('button', { name: 'Reload page' }).click();
    await expect.poll(() => inSite('window.loadedAt'), { timeout: 15_000 }).not.toBe(firstLoad);

    // Permissions are denied unless listed (Electron would grant them all).
    expect(await inSite('navigator.storage.persist()')).toBe(false);

    // A link meant for a new tab loads in the page view instead of a bare window.
    await inSite("document.getElementById('tab').click()");
    await expect.poll(() => inSite('location.search'), { timeout: 15_000 }).toBe('?from=tab');
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  });

  it('keeps overrides after a restart', async () => {
    await app.close();
    ({ app, win } = await launch(userData));
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(4);
    await goTo(win, site.url);
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
  });
});
