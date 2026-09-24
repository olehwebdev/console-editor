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
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { STORE_BUNDLE_PATH } from '../fixtures/demoStore.ts';
import { startFixtureSite } from '../fixtures/site.ts';

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

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as { port: number };
  await new Promise((done) => server.close(done));
  return port;
}

/** Polls `fn` until it returns a truthy value. */
async function waitFor<T>(what: string, fn: () => Promise<T | undefined> | T | undefined, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

const pages = (browser: Browser): Page[] => browser.contexts().flatMap((c) => c.pages());

const executable = resolve(process.argv[2] ?? defaultExecutable());
if (!existsSync(executable)) {
  console.error(`No app at ${executable}. Build one with \`npm run dist -- --dir\`, or pass its path.`);
  process.exit(1);
}

const site = await startFixtureSite();
const storeUrl = `${site.url}/store/`;
const userData = await mkdtemp(join(tmpdir(), 'console-editor-smoke-'));
const port = await freePort();
const args = [`--remote-debugging-port=${port}`];
// Chromium's sandbox can't start as root (containers); CI runners aren't root.
if (process.platform === 'linux' && process.getuid?.() === 0) args.push('--no-sandbox');

console.log(`Starting ${executable}`);
const app = spawn(executable, args, {
  env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData, CONSOLE_EDITOR_URL: storeUrl },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
app.stdout.on('data', (d) => (output += d));
app.stderr.on('data', (d) => (output += d));
let exited = false;
app.on('exit', (code, signal) => {
  exited = true;
  output += `\n[app exited: ${signal ?? code}]`;
});

let browser: Browser | undefined;
let failed = false;
try {
  browser = await waitFor(
    'the remote debugging port',
    async () => {
      if (exited) throw new Error('The app exited during startup');
      return chromium.connectOverCDP(`http://127.0.0.1:${port}`).catch(() => undefined);
    },
    60_000,
  );
  const connected = browser;
  const editor = await waitFor('the editor window', () => pages(connected).find((p) => p.url().endsWith('/renderer/index.html')));
  await editor.waitForSelector('body[data-ready]', { timeout: 30_000 });

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
  console.error(`--- app output ---\n${output.slice(-6000)}`);
} finally {
  await browser?.close().catch(() => undefined);
  app.kill();
  await new Promise((r) => setTimeout(r, 1000));
  await site.close();
  // Windows can hold the profile's files for a moment after the app exits.
  await rm(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }).catch(() => undefined);
}
process.exit(failed ? 1 : 0);
