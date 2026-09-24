/**
 * Update notifications and What's New, against a local server standing in for
 * GitHub. A build run from source doesn't install updates, so this is the
 * download-and-check path (macOS's, and the .tar.gz's); test/smoke/update.ts
 * installs one into a packaged app.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { manualAssetName } from '../../src/main/update/UpdateService';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const NEXT = '9.9.9';
const ASSET = manualAssetName(NEXT, process.platform, process.arch === 'arm64' ? 'arm64' : 'x64');
const ASSET_BYTES = Buffer.alloc(2_000_000, 3);
const NOTES = 'Faster everything, as promised.';

describe.skipIf(!built)('Updates', () => {
  let server: Server;
  let base: string;
  /** Serves a wrong checksum while true. */
  let corrupt = false;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

  beforeAll(async () => {
    const sum = () => (corrupt ? 'f'.repeat(64) : createHash('sha256').update(ASSET_BYTES).digest('hex'));
    server = createServer((req, res) => {
      switch (req.url) {
        case '/releases/latest':
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              tag_name: `v${NEXT}`,
              html_url: `${base}/release`,
              assets: [
                { name: ASSET, browser_download_url: `${base}/download/${ASSET}`, size: ASSET_BYTES.length },
                { name: 'SHA256SUMS.txt', browser_download_url: `${base}/download/SHA256SUMS.txt`, size: 100 },
              ],
            }),
          );
          return;
        case `/changelog/v${NEXT}`:
          res.end(`# Changelog\n\n## [${NEXT}] - 2026-12-01\n\n### Changed\n\n- ${NOTES}\n`);
          return;
        case '/download/SHA256SUMS.txt':
          res.end(`${sum()}  ${ASSET}\n`);
          return;
        case `/download/${ASSET}`:
          res.setHeader('Content-Length', ASSET_BYTES.length);
          res.end(ASSET_BYTES);
          return;
        default:
          res.writeHead(404).end();
      }
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-updates-'));
    app = await electron.launch({
      args: [...sandboxArgs, root],
      cwd: root,
      env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData, CONSOLE_EDITOR_UPDATE_FEED: base } as Record<string, string>,
    });
    // Revealing the download would open a file manager; record it instead.
    await app.evaluate(({ shell }) => {
      const shown: string[] = [];
      (globalThis as { shownFiles?: string[] }).shownFiles = shown;
      shell.showItemInFolder = (path: string) => void shown.push(path);
      shell.openPath = async (path: string) => (shown.push(path), '');
    });
    const deadline = Date.now() + 30_000;
    for (;;) {
      const found = app.windows().find((p) => p.url().endsWith('/renderer/index.html'));
      if (found) {
        win = found;
        break;
      }
      if (Date.now() > deadline) throw new Error('No editor window');
      await new Promise((r) => setTimeout(r, 100));
    }
    await win.waitForSelector('body[data-ready]');
  });

  afterAll(async () => {
    await app?.close();
    server?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  const notifications = () => win.locator('[aria-label="Notifications"]');

  it('announces a new release shortly after start', async () => {
    await notifications().getByText(`Console Editor ${NEXT} is available`).waitFor({ timeout: 30_000 });
    await expect.poll(() => win.getByTestId('update-status').textContent()).toContain(`Update to ${NEXT}`);
  });

  it("shows the release's notes on the What's New page, above this version's", async () => {
    await notifications().getByRole('button', { name: "What's new", exact: true }).click();
    const page = win.getByTestId('whats-new');
    await page.getByText(NOTES).waitFor();
    await expect.poll(() => page.getByTestId('update-card').getByRole('heading', { level: 2 }).textContent()).toBe(`Version ${NEXT} is available`);
    // This build's own notes, from CHANGELOG.md, marked as the one installed.
    await page.getByRole('region', { name: 'Version 0.1.0' }).getByText('Installed').waitFor();
    await expect.poll(() => win.getByRole('tab', { name: "What's New" }).count()).toBe(1);
  });

  it('refuses a download whose checksum is wrong, and keeps nothing of it', async () => {
    corrupt = true;
    await win.getByTestId('update-card').getByRole('button', { name: 'Download', exact: true }).click();
    await notifications().getByText("Couldn't download the update").waitFor({ timeout: 30_000 });
    await win.getByTestId('update-card').getByText('the file is damaged (its checksum does not match)').waitFor();
    expect(await readdir(join(userData, 'downloads'))).toEqual([]);
  });

  it('downloads it again once the checksum matches, and shows the file', async () => {
    corrupt = false;
    await win.getByTestId('update-card').getByRole('button', { name: 'Try again', exact: true }).click();
    await expect.poll(() => win.getByTestId('update-status').textContent(), { timeout: 30_000 }).toContain(`${NEXT} downloaded`);
    const file = join(userData, 'downloads', ASSET);
    expect(await readFile(file)).toEqual(ASSET_BYTES);
    await expect.poll(() => app.evaluate(() => (globalThis as { shownFiles?: string[] }).shownFiles)).toEqual([file]);
    await notifications().getByText(`Console Editor ${NEXT} downloaded`).waitFor();
  });

  it('checks again from the command palette without losing the download', async () => {
    await win.keyboard.press('Control+K');
    await win.keyboard.type('Check for updates');
    await win.keyboard.press('Enter');
    await notifications().getByText(`Console Editor ${NEXT} downloaded`).waitFor();
    await expect.poll(() => win.getByTestId('update-status').textContent()).toContain(`${NEXT} downloaded`);
  });

  it('closes the What’s New tab like any other', async () => {
    await win.getByRole('tab', { name: "What's New" }).hover();
    await win.getByRole('tab', { name: "What's New" }).getByRole('button', { name: /close/i }).click();
    await expect.poll(() => win.getByTestId('whats-new').count()).toBe(0);
  });
});
