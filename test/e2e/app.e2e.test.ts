/**
 * Drives the built Electron app like a user would: open a site, pick a file,
 * edit it, save, and check that the page runs the edited code.
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

describe.skipIf(!built)('Console Editor app', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

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

  /** The website's page (the embedded view), found among the app's CDP targets. */
  function sitePage(): Promise<Page> {
    return waitFor(() => app.context().pages().find((p) => p.url().startsWith(site.url)), 10_000);
  }

  const evalInSite = async (expr: string) => (await sitePage()).evaluate(expr).catch(() => undefined);

  it('opens a website and lists its scripts, stylesheets and document', async () => {
    await win.fill('#url', site.url);
    await win.press('#url', 'Enter');
    await win.locator(`.resource-row[data-url="${site.url}/app.js"]`).waitFor();
    await expect.poll(() => win.locator('.resource-row').count()).toBe(5);
    await expect.poll(() => evalInSite('window.appValue')).toBe('original');
  });

  it('edits a script, saves it as an override, and the reloaded page runs it', async () => {
    await win.click(`.resource-row[data-url="${site.url}/app.js"]`);
    await win.locator('.monaco-editor .view-lines', { hasText: 'window.appValue' }).waitFor();
    await win.click('.monaco-editor .view-lines');
    await win.keyboard.press('Control+End');
    await win.keyboard.press('Enter');
    await win.keyboard.type('window.patchedByEditor = true;');
    await win.keyboard.press('Escape');
    await win.keyboard.press('Control+S');

    await win.locator('.override-row').waitFor();
    await expect.poll(() => evalInSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
    // The rest of the (SRI-protected) file still runs.
    await expect.poll(() => evalInSite("document.querySelector('#app').textContent")).toBe('app: original');
    await expect.poll(() => win.locator('.override-row .hits').textContent()).toBe('1');
  });

  it('pretty-prints a minified bundle and can match every build of a hashed file', async () => {
    await win.click(`.resource-row[data-url="${site.url}${MAIN_JS_PATH}"]`);
    // The one-line bundle was pretty-printed: its first statements now sit on their own lines.
    await win.locator('.monaco-editor .view-line', { hasText: 'version: "1.0.0",' }).waitFor();
    await expect.poll(() => win.locator('.monaco-editor .view-line').count()).toBeGreaterThan(20);

    await win.click('button:has-text("Create override")');
    await win.locator('button:has-text("Match every build")').click();
    await expect.poll(() => win.locator('.match-row select').inputValue()).toBe('glob');
    await expect.poll(() => win.locator('.match-row .pattern').inputValue()).toBe(`${site.url}/static/js/main.*.js`);
    await expect.poll(() => win.locator('.override-row').count()).toBe(2);
  });

  it('disabling an override brings back the live file', async () => {
    const row = win.locator('.override-row', { hasText: 'app.js' });
    await row.locator('input[type=checkbox]').uncheck();
    await expect.poll(() => evalInSite('window.patchedByEditor'), { timeout: 15_000 }).toBeUndefined();
    await expect.poll(() => evalInSite('window.appValue')).toBe('original');
    await row.locator('input[type=checkbox]').check();
    await expect.poll(() => evalInSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
  });

  it('keeps overrides after a restart', async () => {
    await app.close();
    ({ app, win } = await launch(userData));
    await expect.poll(() => win.locator('.override-row').count()).toBe(2);
    await win.fill('#url', site.url);
    await win.press('#url', 'Enter');
    await expect.poll(() => evalInSite('window.patchedByEditor'), { timeout: 15_000 }).toBe(true);
  });
});
