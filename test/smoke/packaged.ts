/**
 * Smoke test for a packaged build: starts the app as installed (not `electron .`)
 * and fixes the demo store's checkout through the UI. That exercises what only
 * a package can break: the renderer and its Monaco workers loaded from app.asar,
 * the preload bridge, CDP interception, and the fuses and signature on the binary.
 *
 *   node test/smoke/packaged.ts [path/to/executable]
 *
 * Without a path it runs the unpacked app electron-builder leaves in dist/.
 * The build's fuses turn Node's inspector off, so the app is driven over
 * Chromium's remote debugging port rather than Playwright's Electron support.
 */
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { STORE_BUNDLE_PATH } from '../fixtures/demoStore.ts';
import { startFixtureSite } from '../fixtures/site.ts';
import { launchApp, pages, waitFor, type RunningApp } from './lib.ts';

const root = resolve(import.meta.dirname, '../..');

function defaultExecutable(): string {
  const arm = process.arch === 'arm64';
  switch (process.platform) {
    case 'darwin':
      return join(root, 'dist', arm ? 'mac-arm64' : 'mac', 'Console Editor.app/Contents/MacOS/Console Editor');
    case 'win32':
      return join(root, 'dist', arm ? 'win-arm64-unpacked' : 'win-unpacked', 'Console Editor.exe');
    default:
      return join(root, 'dist', arm ? 'linux-arm64-unpacked' : 'linux-unpacked', 'console-editor');
  }
}

const executable = resolve(process.argv[2] ?? defaultExecutable());
if (!existsSync(executable)) {
  console.error(`No app at ${executable}. Build one with \`npm run dist -- --dir\`, or pass its path.`);
  process.exit(1);
}

const site = await startFixtureSite();
const storeUrl = `${site.url}/store/`;
const userData = await mkdtemp(join(tmpdir(), 'console-editor-smoke-'));

let running: RunningApp | undefined;
let failed = false;
try {
  running = await launchApp(executable, { CONSOLE_EDITOR_USER_DATA: userData, CONSOLE_EDITOR_URL: storeUrl });
  const { browser: connected, editor } = running;

  // The app opens CONSOLE_EDITOR_URL: the checkout shows $NaN until its bundle is fixed.
  const store = await waitFor('the store page', () => pages(connected).find((p) => p.url() === storeUrl));
  const total = () => store.evaluate<string | undefined>("document.getElementById('total')?.textContent").catch(() => undefined);
  await waitFor('the unfixed total', async () => (await total()) === '$NaN');

  await editor.locator(`[data-testid="resource-row"][data-url="${site.url}${STORE_BUNDLE_PATH}"]`).click({ timeout: 30_000 });
  // Opening pretty-prints the minified bundle in a worker, so this also checks the workers load.
  await editor.locator('.monaco-editor .view-line', { hasText: 'use strict' }).waitFor({ timeout: 30_000 });
  await editor.click('.monaco-editor .view-lines');
  await editor.keyboard.press('ControlOrMeta+F');
  await editor.keyboard.type('sum + item.price');
  await editor.keyboard.press('Enter');
  await editor.keyboard.press('Escape');
  await editor.keyboard.press('ArrowRight');
  await editor.keyboard.type(' * item.qty');
  await editor.keyboard.press('ControlOrMeta+S');

  await waitFor('the fixed total', async () => (await total()) === '$138.00');
  console.log(`Packaged app OK on ${process.platform}-${process.arch}: the edited bundle is live ($NaN → $138.00).`);
  await mkdir(join(root, 'test-results'), { recursive: true });
  await editor.screenshot({ path: join(root, 'test-results', `packaged-${process.platform}-${process.arch}.png`) });
} catch (err) {
  failed = true;
  console.error(err);
  if (running) console.error(`--- app output ---\n${running.output().slice(-6000)}`);
} finally {
  await running?.browser.close().catch(() => undefined);
  running?.process.kill();
  await new Promise((r) => setTimeout(r, 1000));
  await site.close();
  // Windows can hold the profile's files for a moment after the app exits.
  await rm(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }).catch(() => undefined);
}
process.exit(failed ? 1 : 0);
