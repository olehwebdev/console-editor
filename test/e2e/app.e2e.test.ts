/**
 * Drives the built Electron app like a user would: open a site, pick a file,
 * edit it, save, and check that the page (or an iframe in it) runs the edited
 * code.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAIN_JS_PATH, startFixtureSite, type FixtureSite } from '../fixtures/site';
import { built, evalInSite, fileRow, goTo, launch, root, sandboxArgs, typeAtEndOfEditor } from '../helpers/electronApp';

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

  it('hiding the website preview takes the page view with it', async () => {
    // The native view is drawn over the editor window: left in place, it would cover whatever takes the preview's room.
    const viewWidth = () =>
      app.evaluate(({ BrowserWindow, WebContentsView }, url) => {
        const views = BrowserWindow.getAllWindows()[0]!.contentView.children;
        const view = views.find((v) => v instanceof WebContentsView && v.webContents.getURL().startsWith(url));
        return view?.getBounds().width;
      }, site.url);
    await expect.poll(viewWidth).toBeGreaterThan(0);
    await win.getByRole('button', { name: 'Hide website preview' }).click();
    await expect.poll(viewWidth).toBe(0);
    await win.getByRole('button', { name: 'Show website preview' }).click();
    await expect.poll(viewWidth).toBeGreaterThan(0);
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

  it('serves an edit saved in another editor: the page reloads with it, and its tab shows it', async () => {
    const row = win.locator('[data-override-id]', { hasText: 'app.js' });
    const file = join(userData, 'workspace', 'files', `${await row.getAttribute('data-override-id')}.js`);
    // Open in VS Code hands VS Code the file's URL (VS Code itself isn't installed here).
    await app.evaluate(({ shell }) => {
      shell.openExternal = async (url) => void ((globalThis as { openedUrl?: string }).openedUrl = url);
    });
    await row.click();
    await win.getByTestId('open-in-editor').click();
    await expect.poll(() => app.evaluate(() => (globalThis as { openedUrl?: string }).openedUrl)).toBe(`vscode://file${pathToFileURL(file).pathname}`);

    const saved = await readFile(file, 'utf8');
    await writeFile(file, saved.replace('window.patchedByEditor = true;', "window.patchedByEditor = 'elsewhere';"));
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe('elsewhere');
    await win.locator('.monaco-editor .view-line', { hasText: "window.patchedByEditor = 'elsewhere';" }).waitFor();
    await expect.poll(() => win.getByTestId('save-button').textContent()).toContain('Saved');

    // Unsaved edits in the tab are kept, and it says the file changed under them.
    await typeAtEndOfEditor(win, '// mine');
    await writeFile(file, saved.replace('window.patchedByEditor = true;', "window.patchedByEditor = 'again';"));
    await win.getByTestId('edited-outside-banner').waitFor();
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe('again');
    // Monaco draws spaces as non-breaking ones.
    expect((await win.locator('.monaco-editor .view-lines').first().innerText()).replace(/\u00a0/g, ' ')).toContain('// mine');
    await win.getByRole('button', { name: 'Use that version' }).click();
    await win.locator('.monaco-editor .view-line', { hasText: "window.patchedByEditor = 'again';" }).waitFor();
    await expect.poll(() => win.getByTestId('edited-outside-banner').count()).toBe(0);
    await expect.poll(() => win.getByTestId('save-button').textContent()).toContain('Saved');

    // Back to the text the next tests expect.
    await writeFile(file, saved);
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
    await expect.poll(() => inSite('document.title'), { timeout: 15_000 }).toBe('Guarded');
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

  it('reopens the page, the tabs and unsaved edits after a restart, and keeps overrides', async () => {
    await goTo(win, site.url);
    await fileRow(win, `${site.url}/lazy.js`).click();
    await win.locator('.monaco-editor .view-lines', { hasText: 'lazyValue' }).waitFor();
    // Unsaved: closing keeps it as a draft instead of asking to discard it.
    await typeAtEndOfEditor(win, '// unsaved draft survives');
    await expect.poll(() => win.locator('[role="tab"][data-dirty]').count()).toBe(1);
    const tabsBefore = await win.locator('[role="tab"]').count();

    await app.close();
    ({ app, win } = await launch(userData));
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(4);
    // The last page is loaded again, with its overrides applied.
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
    // So are the tabs, the active one being the one with the draft.
    await expect.poll(() => win.locator('[role="tab"]').count()).toBe(tabsBefore);
    await expect.poll(() => win.locator('[role="tab"][aria-selected="true"]').textContent()).toContain('lazy.js');
    await expect.poll(() => win.locator('[role="tab"][data-dirty]').count()).toBe(1);
    await win.locator('.monaco-editor .view-lines', { hasText: 'unsaved draft survives' }).waitFor();
  });

  it('a second launch hands its URL to the running app and quits', async () => {
    const electronBinary = await app.evaluate(() => process.execPath);
    await promisify(execFile)(electronBinary, [...sandboxArgs, root, `${site.url}/frames.html`], {
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData },
      timeout: 20_000,
    });
    await expect.poll(() => inSite('location.pathname'), { timeout: 15_000 }).toBe('/frames.html');
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  });

  it("a URL handed over while the app is still starting wins over the one it was starting with", async () => {
    const electronBinary = await app.evaluate(() => process.execPath);
    await app.close();
    // Not waiting for the window: the second launch arrives while the first is loading its stores and UI.
    app = await electron.launch({
      args: [...sandboxArgs, root],
      cwd: root,
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData, CONSOLE_EDITOR_URL: `${site.url}/store/` } as Record<string, string>,
    });
    await promisify(execFile)(electronBinary, [...sandboxArgs, root, `${site.url}/?from=second-launch`], {
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData },
      timeout: 20_000,
    });
    await expect.poll(() => inSite('location.search'), { timeout: 15_000 }).toBe('?from=second-launch');
    // And stays there: the startup URL doesn't replace it afterwards.
    await new Promise((r) => setTimeout(r, 2000));
    expect(await inSite('location.search')).toBe('?from=second-launch');
  });

  it('keeps a workspace per task, each with its own page, tabs and overrides', async () => {
    await app.close();
    ({ app, win } = await launch(userData));
    const tiles = () => win.getByTestId('workspace-tile');
    await expect.poll(() => tiles().count()).toBe(1);
    // Everything made so far is the first workspace's.
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(4);
    const tabs = await win.locator('[role="tab"]').count();
    expect(tabs).toBeGreaterThan(0);

    await win.getByTestId('workspace-new').click();
    await expect.poll(() => tiles().count()).toBe(2);
    await expect.poll(() => tiles().nth(1).getAttribute('aria-current')).toBe('true');
    // It starts empty, with the address bar waiting for its site.
    await expect.poll(() => win.locator('[role="tab"]').count()).toBe(0);
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(0);
    await expect.poll(() => win.getByTestId('address-bar').evaluate((el) => el === el.ownerDocument.activeElement)).toBe(true);

    // The first workspace's overrides aren't served in this one.
    await goTo(win, `${site.url}/?in=second`);
    await expect.poll(() => inSite('window.appValue'), { timeout: 15_000 }).toBe('original');
    expect(await inSite('typeof window.patchedByEditor')).toBe('undefined');
    // Its tile shows the site's icon once a page has one.
    await goTo(win, `${site.url}/store/`);
    await tiles().nth(1).locator('img').waitFor();

    // Switching back brings the first workspace's page, overrides and tabs.
    await tiles().first().click();
    await expect.poll(() => tiles().first().getAttribute('aria-current')).toBe('true');
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(4);
    await expect.poll(() => win.locator('[role="tab"]').count()).toBe(tabs);
    await expect.poll(() => inSite('location.search'), { timeout: 15_000 }).toBe('?from=second-launch');
    await expect.poll(() => inSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
    // Back leads nowhere: the other workspace's pages aren't in its history.
    await expect.poll(() => win.getByRole('button', { name: 'Back' }).isDisabled()).toBe(true);

    // Clicking the current tile names it.
    await tiles().first().click();
    await win.getByTestId('workspace-name').fill('Fixture site');
    await win.getByTestId('workspace-name').press('Enter');
    await expect.poll(() => tiles().first().getAttribute('aria-label')).toBe('Fixture site (current workspace)');

    // All of it is still there after a restart, and the second workspace's page is where it was left.
    await app.close();
    ({ app, win } = await launch(userData));
    await expect.poll(() => tiles().count()).toBe(2);
    await expect.poll(() => tiles().first().getAttribute('aria-label')).toBe('Fixture site (current workspace)');
    await tiles().nth(1).locator('img').waitFor();
    await tiles().nth(1).click();
    await expect.poll(() => inSite('location.pathname'), { timeout: 15_000 }).toBe('/store/');
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(0);
  });
});
