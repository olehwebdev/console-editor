/**
 * Drives the built Electron app through a bundle's source map: list the
 * originals behind it, open one read-only, jump from an original line to the
 * pretty-printed bundle and back. Its own app, profile and site, so the main
 * e2e run's state is untouched.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAPS_PATH } from '../fixtures/sourceMaps';
import { MAIN_JS_PATH, startFixtureSite, type FixtureSite } from '../fixtures/site';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const LIB_URL = 'webpack://fixture/src/lib.ts';

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

async function goTo(win: Page, url: string): Promise<void> {
  const bar = win.getByTestId('address-bar');
  await bar.fill(url);
  await bar.press('Enter');
}

const fileRow = (win: Page, url: string) => win.locator(`[data-testid="resource-row"][data-url="${url}"]`);
const sourceRow = (win: Page, url: string) => win.locator(`[data-testid="source-row"][data-source-url="${url}"]`);
const activeLine = (win: Page) => win.locator('.monaco-editor .line-numbers.active-line-number');
/** The editor's text as shown (Monaco draws spaces as non-breaking ones). */
const shownText = async (win: Page) => (await win.locator('.monaco-editor .view-lines').first().innerText()).replace(/ /g, ' ');

/** Opens a script's or stylesheet's nest of originals from the keyboard, as → on its row does. */
async function expand(win: Page, url: string): Promise<void> {
  const row = fileRow(win, url);
  await row.focus();
  await row.press('ArrowRight');
}

describe.skipIf(!built)('Source-map explorer', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  let bundleUrl: string;

  beforeAll(async () => {
    site = await startFixtureSite();
    bundleUrl = `${site.url}${MAIN_JS_PATH}`;
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-sources-'));
    // No executablePath: Playwright then injects its loader, which Electron apps need.
    app = await electron.launch({
      args: [...sandboxArgs, root],
      cwd: root,
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string>,
    });
    // The embedded website view is also a page; pick the editor UI.
    win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
    await win.waitForSelector('body[data-ready]');
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it('lists the original files behind a bundle', async () => {
    await goTo(win, site.url);
    await fileRow(win, bundleUrl).waitFor();
    await expect.poll(() => win.getByTestId('resource-row').count()).toBe(5);

    await expand(win, bundleUrl);
    await sourceRow(win, LIB_URL).waitFor();
    await expect.poll(() => fileRow(win, bundleUrl).getAttribute('aria-expanded')).toBe('true');
    // Library code sits in its own group, closed.
    await expect.poll(() => win.locator('[data-testid="source-folder-row"][data-variant="library"]').getAttribute('aria-expanded')).toBe('false');
    expect(await win.getByTestId('source-row').count()).toBe(4);
    // Originals are rows of their own, not page files.
    expect(await win.getByTestId('resource-row').count()).toBe(5);
  });

  it('opens an original file read-only', async () => {
    await sourceRow(win, LIB_URL).click();
    const header = win.getByTestId('source-header');
    await expect.poll(() => header.textContent()).toContain('Read-only');
    await win.locator('.monaco-editor .view-line', { hasText: 'greet(name: string)' }).waitFor();
    expect(await win.getByTestId('save-button').count()).toBe(0);
    await expect.poll(() => win.getByTestId('status-read-only').count()).toBe(1);

    await win.locator('.monaco-editor .view-line', { hasText: 'greet(name: string)' }).click();
    await win.keyboard.type('zzz');
    expect(await shownText(win)).not.toContain('zzz');
    expect(await shownText(win)).toContain("return 'Hello, ' + name;");
  });

  it('jumps from an original line to the pretty-printed bundle line, and back to where that code came from', async () => {
    // The cursor is on lib.ts line 3 (greet), from the click above.
    await win.getByTestId('go-to-bundle').click();
    await expect.poll(() => win.getByTestId('file-header').count()).toBe(1);
    await expect.poll(() => activeLine(win).textContent()).toBe('5');
    await win.locator('.monaco-editor .view-line', { hasText: 'greet: function(n)' }).waitFor();

    await win.locator('.monaco-editor .view-line', { hasText: 'sum: function(n)' }).click();
    await expect.poll(() => activeLine(win).textContent()).toBe('8');
    await win.keyboard.press('Control+Shift+M');
    await expect.poll(() => win.getByTestId('source-header').count()).toBe(1);
    // Line 6 of lib.ts (sum), not line 3 where the tab was left: the jump wins over its saved position.
    await expect.poll(() => activeLine(win).textContent()).toBe('6');
  });

  it('keeps the bundle editable after visiting an original', async () => {
    await win.getByRole('tab', { name: /main\.3f9a1c2b\.js/ }).click();
    await expect.poll(() => win.getByTestId('file-header').count()).toBe(1);
    await win.locator('.monaco-editor .view-line', { hasText: 'version: "1.0.0",' }).click();
    await win.keyboard.press('End');
    await win.keyboard.type(' // edited');
    await expect.poll(() => shownText(win)).toContain('version: "1.0.0", // edited');
    await win.keyboard.press('Control+Z');
  });

  it('finds an original from the palette', async () => {
    await win.keyboard.press('Control+K');
    await win.keyboard.type('store.ts');
    await win.keyboard.press('Enter');
    await expect.poll(() => win.getByTestId('source-header').textContent()).toContain('store.ts');
    await win.locator('.monaco-editor .view-line', { hasText: 'export interface Item' }).waitFor();
  });

  it('says so for a file without a source map', async () => {
    const appJs = `${site.url}/app.js`;
    await expand(win, appJs);
    await win.getByText(/app\.js has no source map/).waitFor();
    await expect.poll(() => fileRow(win, appJs).getAttribute('aria-expanded')).toBeNull();
  });

  it("reads a stylesheet's map from its comment", async () => {
    await goTo(win, `${site.url}${MAPS_PATH.page}`);
    const themeUrl = `${site.url}${MAPS_PATH.theme}`;
    await fileRow(win, themeUrl).waitFor();
    await expand(win, themeUrl);
    const scss = sourceRow(win, `${site.url}/scss/theme.scss`);
    await scss.click();
    await win.locator('.monaco-editor .view-line', { hasText: '$accent: #3b82f6;' }).waitFor();
    await expect.poll(() => win.getByTestId('source-header').textContent()).toContain('theme.scss');
  });
});
