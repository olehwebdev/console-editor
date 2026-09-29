/**
 * Your everyday Firefox's tabs, in the built app on Linux: with Firefox installed, the browser menu offers its tabs;
 * asked, it lists them from the session file of your Firefox profile (read only then), the search narrows them, and
 * choosing one loads its address in the app.
 */
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mozLz4 } from '../helpers/mozLz4';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];
const EDITOR_URL = /\/renderer\/index\.html$/;

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

describe.skipIf(!built || process.platform !== 'linux')('Your Firefox tabs', () => {
  let server: Server;
  let origin: string;
  let dir: string;
  let app: ElectronApplication;
  let win: Page;
  const menu = () => win.getByTestId('browser-menu');

  beforeAll(async () => {
    server = createServer((req, res) => void res.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><title>${new URL(req.url ?? '/', 'http://x').pathname}</title>`));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    dir = await mkdtemp(join(tmpdir(), 'console-editor-e2e-everyday-'));
    // A Firefox launcher (never started here), and a Firefox profile with a session in the home folder.
    mkdirSync(join(dir, 'data/applications'), { recursive: true });
    mkdirSync(join(dir, 'system'), { recursive: true });
    const program = join(dir, 'firefox');
    writeFileSync(program, '#!/bin/sh\n');
    chmodSync(program, 0o755);
    writeFileSync(join(dir, 'data/applications/firefox.desktop'), `[Desktop Entry]\nType=Application\nName=Firefox\nExec=${program} %u\nCategories=Network;WebBrowser;\n`);
    const firefox = join(dir, 'home/.mozilla/firefox');
    mkdirSync(join(firefox, 'Profiles/a.default-release/sessionstore-backups'), { recursive: true });
    writeFileSync(join(firefox, 'profiles.ini'), '[Profile0]\nName=default-release\nIsRelative=1\nPath=Profiles/a.default-release\n');
    const tab = (path: string, title: string) => ({ index: 1, entries: [{ url: `${origin}${path}`, title }] });
    writeFileSync(join(firefox, 'Profiles/a.default-release/sessionstore-backups/recovery.jsonlz4'), mozLz4({ windows: [{ tabs: [tab('/cart', 'Your cart'), tab('/account', 'Your account'), { index: 1, entries: [{ url: 'about:newtab' }] }] }] }));

    app = await electron.launch({
      args: [...sandboxArgs, root],
      cwd: root,
      env: { ...process.env, HOME: join(dir, 'home'), CONSOLE_EDITOR_USER_DATA: join(dir, 'user-data'), XDG_DATA_HOME: join(dir, 'data'), XDG_DATA_DIRS: join(dir, 'system') } as Record<string, string>,
    });
    win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
    await win.waitForSelector('body[data-ready]');
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(dir, { recursive: true, force: true });
  });

  it('lists them once asked, narrowed by the search, and loads one here', async () => {
    await win.getByTestId('browser-menu-button').click();
    // Nothing is read before it is asked for.
    expect(await menu().getByTestId('everyday-tabs').count()).toBe(0);
    await menu().getByTestId('everyday-show').click();
    await expect.poll(() => menu().getByTestId('everyday-tab').allInnerTexts()).toEqual([`Your cart\n${origin}/cart`, `Your account\n${origin}/account`]);
    expect(await menu().getByTestId('everyday-tabs').innerText()).toContain('Firefox · default-release');
    await menu().getByRole('textbox', { name: 'Search browsers' }).fill('account');
    await expect.poll(() => menu().getByTestId('everyday-tab').count()).toBe(1);
    await menu().getByTestId('everyday-tab').click();
    await expect.poll(() => win.getByTestId('address-bar').inputValue(), { timeout: 15_000 }).toBe(`${origin}/account`);
  });
});
