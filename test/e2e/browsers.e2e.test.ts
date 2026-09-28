/**
 * Other browsers, in the built app on Linux: a fake Chromium installed as a launcher (whose program writes down the
 * address it was given) is offered beside the address bar, in both windows and the palette; opening the page there,
 * searching, turning it off in Settings, and adding and removing a browser by its program.
 */
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

const EDITOR_URL = /\/renderer\/index\.html$/;
const PAGE_WINDOW_URL = /\/renderer\/index\.html#page-window$/;
const FAKE_ID = 'desktop:fake-chromium.desktop';

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

/** An executable shell script. */
function script(path: string, body: string): string {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

/** What a fake browser was last asked to open, '' before that. */
const opened = (file: string) => readFile(file, 'utf8').then((text) => text.trim(), () => '');

describe.skipIf(!built || process.platform !== 'linux')('Other browsers', () => {
  let site: FixtureSite;
  let dir: string;
  let app: ElectronApplication;
  let win: Page;
  let openedFile: string;
  let addedFile: string;
  let addedProgram: string;

  beforeAll(async () => {
    site = await startFixtureSite();
    dir = await mkdtemp(join(tmpdir(), 'console-editor-e2e-browsers-'));
    openedFile = join(dir, 'opened.txt');
    addedFile = join(dir, 'added.txt');
    const version = 'if [ "$1" = "--version" ]; then echo "Fake Chromium 99.0.1"; exit 0; fi';
    const fake = script(join(dir, 'fake-chromium'), `${version}\necho "$@" > "${openedFile}"`);
    addedProgram = script(join(dir, 'nightly'), `echo "$@" > "${addedFile}"`);
    mkdirSync(join(dir, 'data/applications'), { recursive: true });
    mkdirSync(join(dir, 'system'), { recursive: true });
    writeFileSync(join(dir, 'data/applications/fake-chromium.desktop'), `[Desktop Entry]\nType=Application\nName=Fake Chromium\nExec=${fake} %u\nCategories=Network;WebBrowser;\n`);

    app = await electron.launch({
      args: [...sandboxArgs, root],
      cwd: root,
      // Only this test's launcher, and no system ones (Flatpak's and Snap's may still add theirs).
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: join(dir, 'user-data'), XDG_DATA_HOME: join(dir, 'data'), XDG_DATA_DIRS: join(dir, 'system') } as Record<string, string>,
    });
    win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
    await win.waitForSelector('body[data-ready]');
    const bar = win.getByTestId('address-bar');
    await bar.fill(`${site.url}/`);
    await bar.press('Enter');
    // The page's title shows once it has loaded (expect.poll can't run before the tests).
    await win.getByText('Fixture site').first().waitFor({ timeout: 20_000 });
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(dir, { recursive: true, force: true });
  });

  const row = (page: Page, id = FAKE_ID) => page.locator(`[data-testid="browser-row"][data-browser-id="${id}"]`);

  it('offers the installed browser beside the address bar, with its version, and opens the page there', async () => {
    await win.getByTestId('browser-menu-button').click();
    await expect.poll(() => row(win).innerText()).toContain('Fake Chromium');
    await expect.poll(() => row(win).innerText(), { timeout: 10_000 }).toContain('99.0.1');

    // The search narrows the list; Enter opens the first match.
    const search = win.getByRole('textbox', { name: 'Search browsers' });
    await search.fill('nothing like it');
    await win.getByText('No browser matches.').waitFor();
    await search.fill('fake');
    await search.press('Enter');
    await expect.poll(() => opened(openedFile), { timeout: 10_000 }).toBe(`${site.url}/`);
    await expect.poll(() => win.getByTestId('browser-menu').count()).toBe(0);
  });

  it('opens it from the palette too', async () => {
    await rm(openedFile, { force: true });
    await win.keyboard.press('Control+K');
    await win.keyboard.type('Open in Fake');
    await win.getByRole('option', { name: 'Open in Fake Chromium', exact: true }).click();
    await expect.poll(() => opened(openedFile), { timeout: 10_000 }).toBe(`${site.url}/`);
  });

  it('stops offering a browser turned off in Settings, and adds and removes one by its program', async () => {
    await win.getByTestId('rail-settings').click();
    const offer = win.getByRole('switch', { name: 'Offer Fake Chromium' });
    await offer.click();
    await expect.poll(() => offer.getAttribute('aria-checked')).toBe('false');
    await win.getByTestId('browser-menu-button').click();
    await win.getByText('No other browsers were found. Add one in Settings › Browsers.').waitFor();
    await win.keyboard.press('Escape');
    await offer.click();
    await expect.poll(() => offer.getAttribute('aria-checked')).toBe('true');

    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as unknown as typeof dialog.showOpenDialog;
    }, addedProgram);
    await win.getByRole('button', { name: 'Add a browser…' }).click();
    const added = win.getByTestId('browser-setting').filter({ hasText: 'nightly' });
    await expect.poll(() => added.innerText()).toContain('added by you');

    await win.getByTestId('browser-menu-button').click();
    const addedRow = win.getByTestId('browser-row').filter({ hasText: 'nightly' });
    await addedRow.click();
    await expect.poll(() => opened(addedFile), { timeout: 10_000 }).toBe(`${site.url}/`);

    await win.getByRole('button', { name: 'Remove nightly' }).click();
    await expect.poll(() => added.count()).toBe(0);
  });

  it("offers them in the website's own window too", async () => {
    await rm(openedFile, { force: true });
    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Open in its own window' }).click();
    const own = await waitFor(() => app.windows().find((p) => PAGE_WINDOW_URL.test(p.url()) && !p.isClosed()));
    await own.waitForSelector('body[data-ready]');
    await own.getByTestId('browser-menu-button').click();
    await row(own).click();
    await expect.poll(() => opened(openedFile), { timeout: 10_000 }).toBe(`${site.url}/`);
    // No settings there: the gear is the editor's.
    await own.getByTestId('browser-menu-button').click();
    expect(await own.getByRole('button', { name: 'Browser settings' }).count()).toBe(0);
  });
});
