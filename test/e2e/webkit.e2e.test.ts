/**
 * The WebKit build the app downloads, in the built app on Linux: listed in the browser menu on every system, to be
 * downloaded first; downloaded from a stand-in for Playwright's host once agreed, its progress in its row; a build that
 * can't start (the stand-in's) said so; and its download removed in Settings.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { zipOf } from '../helpers/zipOf';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];
const EDITOR_URL = /\/renderer\/index\.html$/;
const WEBKIT_ID = 'playwright:webkit';

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** A stand-in WebKit build: a program that can't start, and a library to make it a download worth watching. */
const fakeBuild = () =>
  zipOf([
    { name: 'pw_run.sh', data: Buffer.from('#!/bin/sh\necho "not really WebKit" >&2\nexit 1\n'), mode: 0o100644 },
    { name: 'lib/libwebkit.so', data: Buffer.alloc(2_000_000, 7), compress: false },
  ]);

describe.skipIf(!built || process.platform !== 'linux')('WebKit, downloaded by the app', () => {
  let server: Server;
  let dir: string;
  let app: ElectronApplication;
  let win: Page;
  let origin: string;
  const menu = () => win.getByTestId('browser-menu');
  const row = () => menu().locator(`[data-testid="browser-row"][data-browser-id="${WEBKIT_ID}"]`);

  beforeAll(async () => {
    const zip = await fakeBuild();
    server = createServer((req, res) => {
      if (req.url!.startsWith('/builds/webkit/')) return void res.writeHead(200, { 'content-type': 'application/zip', 'content-length': String(zip.length) }).end(zip);
      res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>Checked in WebKit</title>');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    dir = await mkdtemp(join(tmpdir(), 'console-editor-e2e-webkit-'));
    app = await electron.launch({
      args: [...sandboxArgs, root],
      cwd: root,
      // No browsers of the system's: only the WebKit build; Playwright's host is the stand-in.
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: join(dir, 'user-data'), XDG_DATA_HOME: join(dir, 'data'), XDG_DATA_DIRS: join(dir, 'system'), PLAYWRIGHT_DOWNLOAD_HOST: origin } as Record<string, string>,
    });
    win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
    await win.waitForSelector('body[data-ready]');
    await win.getByTestId('address-bar').fill(`${origin}/`);
    await win.getByTestId('address-bar').press('Enter');
    await waitFor(() => app.evaluate(({ webContents }, o) => webContents.getAllWebContents().some((wc) => wc.getURL() === `${o}/` && !wc.isLoading()), origin));
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  it('offers WebKit to download first, downloads it once agreed, and says why a build that can\'t start didn\'t', async () => {
    await win.getByTestId('browser-menu-button').click();
    await expect.poll(() => row().innerText()).toContain('Download');
    await row().getByRole('button', { name: /^WebKit/ }).click();
    const dialog = win.getByRole('alertdialog');
    await expect.poll(() => dialog.innerText()).toContain('Download WebKit?');
    await dialog.getByRole('button', { name: 'Download' }).click();
    await win.getByText('WebKit is downloaded').waitFor();
    // The stand-in isn't WebKit: it can't start, and the app says so.
    await win.getByText('Could not open WebKit with your changes').waitFor({ timeout: 30_000 });
    await win.getByText("WebKit couldn't start: not really WebKit").waitFor();
    expect(existsSync(join(dir, 'user-data/browsers/playwright'))).toBe(true);
    if (!(await menu().count())) await win.getByTestId('browser-menu-button').click();
    await expect.poll(() => row().innerText()).toMatch(/WebKit\s+\d+\.\d+/);
    await win.keyboard.press('Escape');
  });

  it('removes its download in Settings, to be downloaded again when next used', async () => {
    await win.getByTestId('rail-settings').click();
    const setting = win.getByTestId('browser-setting').filter({ hasText: 'WebKit' });
    await expect.poll(() => setting.innerText()).toContain('downloaded by the app');
    await setting.getByTestId('browser-remove-download').click();
    await expect.poll(() => setting.innerText()).toContain('downloaded when first used');
  });
});
