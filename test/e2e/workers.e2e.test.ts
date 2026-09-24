/**
 * Workers in the built app. The fixture's /workers/ page starts a dedicated
 * worker (which starts a nested one), a module worker, a shared worker, a
 * service worker and an audio worklet; each reports a value from a script it
 * loaded to `window.workerResults`. Electron's Chromium pauses and attaches
 * workers unlike the one the integration tests drive, so this is where worker
 * support is proven.
 *
 * Playwright's own debugger session on the website resumes workers that the
 * app leaves paused, so the checks that they run at all also launch the app
 * without it (`launchUndebugged`).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

/** What each worker reports with the fixture's files unchanged. */
const ORIGINAL_RESULTS = {
  worker: 'original-lib',
  nested: 'original-nested:original-nested-lib',
  module: 'original-dep',
  shared: 'original-shared-lib',
  sw: 'original-sw:original-sw-lib',
  worklet: 'original',
};

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
    args: [...sandboxArgs, root],
    cwd: root,
    env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string>,
  });
  // The embedded website view is also a page; pick the editor UI.
  const win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
  await win.waitForSelector('body[data-ready]');
  return { app, win };
}

/**
 * Runs in the app's main process: evaluates `expr` in the website through
 * Electron's WebFrameMain. Resolves undefined if the page is replaced before
 * it answers (a reload in progress), so a polling caller simply tries again.
 */
async function evalInSite({ webContents }: typeof import('electron'), [siteUrl, expr]: readonly [string, string]): Promise<unknown> {
  const wc = webContents.getAllWebContents().find((w) => w.getURL().startsWith(siteUrl));
  if (!wc) return undefined;
  const gone = new Promise((resolve) => setTimeout(resolve, 500, undefined));
  return Promise.race([wc.mainFrame.executeJavaScript(expr), gone]);
}

interface UndebuggedApp {
  inSite(expr: string): Promise<unknown>;
  close(): Promise<void>;
}

/**
 * Starts the app opening `url`, with no debugger attached to its pages, and
 * reaches the website through the main process's Node inspector instead.
 */
async function launchUndebugged(electronBinary: string, userData: string, url: string): Promise<UndebuggedApp> {
  const child = spawn(electronBinary, [...sandboxArgs, '--inspect=0', root], {
    cwd: root,
    env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData, CONSOLE_EDITOR_URL: url },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const exited = new Promise<void>((done) => child.once('exit', () => done()));
  const inspectorUrl = await new Promise<string>((resolve, reject) => {
    child.stderr.on('data', (chunk) => {
      const found = /ws:\/\/\S+/.exec(String(chunk));
      if (found) resolve(found[0]);
    });
    void exited.then(() => reject(new Error('The app quit during startup')));
  });
  const inspector = new WebSocket(inspectorUrl);
  await new Promise((opened) => inspector.addEventListener('open', opened, { once: true }));
  const pending = new Map<number, (value: unknown) => void>();
  inspector.addEventListener('message', (event) => {
    const { id, result } = JSON.parse(String(event.data)) as { id: number; result?: { result?: { value?: unknown } } };
    pending.get(id)?.(result?.result?.value);
    pending.delete(id);
  });
  let lastId = 0;
  const evaluate = (expression: string) =>
    new Promise<unknown>((resolve) => {
      pending.set(++lastId, resolve);
      inspector.send(JSON.stringify({ id: lastId, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
    });
  const args = (expr: string) => JSON.stringify([new URL(url).origin, expr]);
  return {
    inSite: (expr) => evaluate(`(${evalInSite})(process.mainModule.require('electron'), ${args(expr)})`),
    close: async () => {
      inspector.close();
      child.kill();
      await exited;
    },
  };
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

describe.skipIf(!built)('Workers in the app', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  /** The app started again at the end, without Playwright. */
  let restarted: UndebuggedApp | undefined;
  /** Requests the fixture site received, by path. */
  const hits = new Map<string, number>();
  const url = (path: string) => `${site.url}${path}`;
  const inSite = (expr: string) => app.evaluate(evalInSite, [site.url, expr] as const).catch(() => undefined);
  /** What a worker reported to the page, undefined until it has. */
  const result = (key: keyof typeof ORIGINAL_RESULTS) => inSite(`window.workerResults?.${key}`);

  beforeAll(async () => {
    site = await startFixtureSite();
    site.server.on('request', (req) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      hits.set(path, (hits.get(path) ?? 0) + 1);
    });
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-workers-'));
    ({ app, win } = await launch(userData));
  });

  afterAll(async () => {
    await restarted?.close();
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  /** Opens a file, appends `line` and saves it as a new override (which reloads the page). */
  async function editAndSave(path: string, loaded: string, line: string): Promise<void> {
    const overrides = await win.locator('[data-override-id]').count();
    await fileRow(win, url(path)).click();
    await win.locator('.monaco-editor .view-lines', { hasText: loaded }).waitFor();
    await typeAtEndOfEditor(win, line);
    await win.keyboard.press('Control+S');
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(overrides + 1);
  }

  it('runs every kind of worker with no other debugger to resume them', async () => {
    // The app used to leave dedicated workers and worklets paused forever.
    const electronBinary = await app.evaluate(() => process.execPath);
    const ownData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-workers-'));
    const undebugged = await launchUndebugged(electronBinary, ownData, url('/workers/'));
    try {
      await expect.poll(() => undebugged.inSite('window.workerResults'), { timeout: 15_000 }).toEqual(ORIGINAL_RESULTS);
    } finally {
      await undebugged.close();
      await rm(ownData, { recursive: true, force: true, maxRetries: 5 });
    }
  });

  it('opens a page with workers and lists the files they load, marked with the kind of worker', async () => {
    await goTo(win, url('/workers/'));
    await expect.poll(() => inSite('window.workerResults'), { timeout: 15_000 }).toEqual(ORIGINAL_RESULTS);

    // Every file row's URL, and the kind of worker it's marked with.
    const rows = () =>
      win.evaluate(
        `Object.fromEntries([...document.querySelectorAll('[data-testid="resource-row"]')].map((row) => [row.dataset.url, row.getAttribute('data-worker')]))`,
      );
    await expect.poll(rows).toEqual({
      [url('/workers/')]: null,
      [url('/workers/worker.js')]: 'worker',
      [url('/workers/lib.js')]: 'worker',
      [url('/workers/nested.js')]: 'worker',
      [url('/workers/nested-lib.js')]: 'worker',
      [url('/workers/module.js')]: 'worker',
      [url('/workers/dep.js')]: 'worker',
      [url('/workers/shared.js')]: 'shared_worker',
      [url('/workers/shared-lib.js')]: 'shared_worker',
      [url('/workers/sw.js')]: 'service_worker',
      [url('/workers/sw-lib.js')]: 'service_worker',
      [url('/workers/worklet.js')]: 'worklet',
    });

    const badge = (path: string) => fileRow(win, url(path)).locator('.worker-badge');
    expect(await badge('/workers/lib.js').textContent()).toBe('worker');
    expect(await badge('/workers/lib.js').getAttribute('aria-label')).toBe('Loaded by worker worker.js');
    expect(await badge('/workers/shared-lib.js').getAttribute('aria-label')).toBe('Loaded by shared worker shared.js');
    expect(await badge('/workers/sw.js').textContent()).toBe('service worker');
    expect(await badge('/workers/sw.js').getAttribute('aria-label')).toBe('Service worker script');
    expect(await badge('/workers/sw-lib.js').getAttribute('aria-label')).toBe('Loaded by service worker sw.js');
    expect(await badge('/workers/worklet.js').getAttribute('aria-label')).toBe('Loaded by a worklet');
    // worker.js, nested.js, module.js, shared.js, sw.js and the worklet.
    await expect.poll(() => win.getByTestId('status-workers').getAttribute('data-count')).toBe('6');
  });

  it('serves an edited file that a dedicated worker imports', async () => {
    await editAndSave('/workers/lib.js', 'libValue', "self.libValue = 'patched-lib';");
    await expect.poll(() => result('worker'), { timeout: 15_000 }).toBe('patched-lib');
    await expect.poll(() => result('module'), { timeout: 15_000 }).toBe(ORIGINAL_RESULTS.module);
  });

  it("applies an edit to a service worker's import on the save's reload, and keeps it", async () => {
    const installs = hits.get('/workers/sw.js') ?? 0;
    await editAndSave('/workers/sw-lib.js', 'swLibValue', "self.swLibValue = 'patched-sw-lib';");
    // The reload unregistered the outdated service worker, so the page's register() installed it again, edited.
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe('original-sw:patched-sw-lib');
    const reinstalls = hits.get('/workers/sw.js') ?? 0;
    expect(reinstalls).toBeGreaterThan(installs);

    await inSite('window.beforeReload = true');
    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Reload page' }).click();
    await expect.poll(() => inSite('!window.beforeReload && window.workerResults.sw'), { timeout: 15_000 }).toBe('original-sw:patched-sw-lib');
    // Up to date, so not installed again.
    expect(hits.get('/workers/sw.js')).toBe(reinstalls);
  });

  it('serves an edited file that a shared worker imports', async () => {
    await editAndSave('/workers/shared-lib.js', 'sharedLibValue', "self.sharedLibValue = 'patched-shared-lib';");
    await expect.poll(() => result('shared'), { timeout: 15_000 }).toBe('patched-shared-lib');
  });

  it("says why an edit to a nested worker's first script can't apply", async () => {
    // Electron 44's Chromium pauses that script on no session the app can reach.
    await editAndSave('/workers/nested.js', 'nestedLibValue', "postMessage('patched-nested');");
    await win.locator('[aria-label="Notifications"]').getByText("Your override can't apply to nested.js").waitFor({ timeout: 15_000 });
    // The worker still runs.
    await expect.poll(() => result('nested'), { timeout: 15_000 }).toBe(ORIGINAL_RESULTS.nested);
  });

  it('serves the edits after a restart, with no other debugger attached', async () => {
    const electronBinary = await app.evaluate(() => process.execPath);
    await app.close();
    restarted = await launchUndebugged(electronBinary, userData, url('/workers/'));
    // The service worker is the next test's.
    const { sw: _, ...others } = ORIGINAL_RESULTS;
    await expect
      .poll(() => restarted!.inSite('window.workerResults'), { timeout: 15_000 })
      .toMatchObject({ ...others, worker: 'patched-lib', shared: 'patched-shared-lib' });
  });

  it('reaches the service worker it installed before the restart from the next page load', async () => {
    // A Chromium quirk: with the page bypassing service workers (the default), the first page load after a
    // restart can't reach one installed in an earlier run (navigator.serviceWorker.ready never resolves).
    expect(await restarted!.inSite('window.workerResults.sw ?? null')).toBeNull();
    await restarted!.inSite('setTimeout(() => location.reload(), 0)');
    // Installed with the edited sw-lib.js, which it keeps.
    await expect.poll(() => restarted!.inSite('window.workerResults?.sw'), { timeout: 15_000 }).toBe('original-sw:patched-sw-lib');
  });
});
