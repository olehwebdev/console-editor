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

/** The files /workers/ lists, and the kind of worker each is marked with (null: the page). */
function workersPageFiles(siteUrl: string): Record<string, string | null> {
  const kinds: Record<string, string | null> = {
    '': null,
    'worker.js': 'worker',
    'lib.js': 'worker',
    'nested.js': 'worker',
    'nested-lib.js': 'worker',
    'module.js': 'worker',
    'dep.js': 'worker',
    'shared.js': 'shared_worker',
    'shared-lib.js': 'shared_worker',
    'sw.js': 'service_worker',
    'sw-lib.js': 'service_worker',
    'worklet.js': 'worklet',
  };
  return Object.fromEntries(Object.entries(kinds).map(([file, kind]) => [`${siteUrl}/workers/${file}`, kind]));
}

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
  let exit: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  const exited = new Promise<void>((done) =>
    child.once('exit', (code, signal) => {
      exit = { code, signal };
      done();
    }),
  );
  const quit = () =>
    new Error(exit?.signal ? `The app crashed (${exit.signal})` : `The app quit (exit code ${exit?.code}): a second instance hands its URL over and exits`);
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
    // An app that quit never answers: say so rather than wait.
    inSite: (expr) =>
      exit
        ? Promise.reject(quit())
        : Promise.race([
            // The inspector runs an evaluation at once, even in the middle of the app's own code: while it
            // creates its windows at startup, a call into their WebContents crashes Electron (SIGSEGV). So
            // Electron is only touched from a task of its own.
            evaluate(
              `new Promise((turn) => setTimeout(turn, 0)).then(() => (${evalInSite.toString()})(process.mainModule.require('electron'), ${args(expr)}))`,
            ),
            exited.then(() => Promise.reject(quit())),
          ]),
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

async function replaceEditorText(win: Page, text: string): Promise<void> {
  await win.click('.monaco-editor .view-lines');
  await win.keyboard.press('Control+A');
  await win.keyboard.type(text);
  await win.keyboard.press('Escape');
}

async function goTo(win: Page, url: string): Promise<void> {
  const bar = win.getByTestId('address-bar');
  await bar.fill(url);
  await bar.press('Enter');
}

const fileRow = (win: Page, url: string) => win.locator(`[data-testid="resource-row"][data-url="${url}"]`);

/** Opens a file, lets `edit` change it and saves it as a new override (which reloads the page). */
async function saveNewOverride(win: Page, fileUrl: string, loaded: string, edit: () => Promise<void>): Promise<void> {
  const overrides = await win.locator('[data-override-id]').count();
  await fileRow(win, fileUrl).click();
  await win.locator('.monaco-editor .view-lines', { hasText: loaded }).waitFor();
  await edit();
  await win.keyboard.press('Control+S');
  await expect.poll(() => win.locator('[data-override-id]').count()).toBe(overrides + 1);
}

/** Every file row's URL, and the kind of worker it's marked with (null: loaded by the page). */
const listedFiles = (win: Page) =>
  win.evaluate(
    `Object.fromEntries([...document.querySelectorAll('[data-testid="resource-row"]')].map((row) => [row.dataset.url, row.getAttribute('data-worker')]))`,
  );

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
  const editAndSave = (path: string, loaded: string, line: string) => saveNewOverride(win, url(path), loaded, () => typeAtEndOfEditor(win, line));

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

    await expect.poll(() => listedFiles(win)).toEqual(workersPageFiles(site.url));

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

  it("runs each workspace's edit of a service worker's script as you switch between workspaces on the same site", async () => {
    const tiles = () => win.getByTestId('workspace-tile');
    // A new workspace has none of this one's overrides: the service worker the page gets is the live one.
    await win.getByTestId('workspace-new').click();
    await expect.poll(() => tiles().count()).toBe(2);
    await goTo(win, url('/workers/'));
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe(ORIGINAL_RESULTS.sw);
    // Back to the first one: its edit runs again on the load the switch makes.
    await tiles().first().click();
    await expect.poll(() => tiles().first().getAttribute('aria-current')).toBe('true');
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe('original-sw:patched-sw-lib');
  });

  it('serves the edits after a restart, with no other debugger attached', async () => {
    const electronBinary = await app.evaluate(() => process.execPath);
    // Until the old process is gone it holds the data folder's single-instance lock, and the new one would hand over and quit.
    const old = app.process();
    const oldExited = old.exitCode === null ? new Promise((done) => old.once('exit', done)) : Promise.resolve();
    await app.close();
    await oldExited;
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

/**
 * Edits of every kind of script a worker runs, in an app of its own: the
 * first scripts of workers and worklets, static module imports, a service
 * worker's own script (edited twice, turned off and on, deleted), a worker in
 * a cross-site iframe, and service workers the page doesn't bypass.
 */
describe.skipIf(!built)('Editing what workers run, in the app', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  const hits = new Map<string, number>();
  const url = (path: string) => `${site.url}${path}`;
  const inSite = (expr: string) => app.evaluate(evalInSite, [site.url, expr] as const).catch(() => undefined);
  const result = (key: string) => inSite(`window.workerResults?.${key}`);
  const overrideRow = (file: string) => win.locator('[data-override-id]', { hasText: file });
  const reloadPage = () => win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Reload page' }).click();
  /** Marks the current document, so a poll can tell the one a reload brings. */
  const markDocument = () => inSite('window.beforeReload = true');
  const inNewDocument = (key: string) => inSite(`!window.beforeReload && window.workerResults?.${key}`);
  /** What the page's active service worker answers now (the page asks it only once, on load). */
  const askServiceWorker = () =>
    inSite(`new Promise((answer) => {
      navigator.serviceWorker.addEventListener('message', (e) => answer(e.data.sw), { once: true });
      navigator.serviceWorker.getRegistration('/workers/').then((r) => r.active.postMessage('ping'));
    })`);

  beforeAll(async () => {
    site = await startFixtureSite();
    site.server.on('request', (req) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      hits.set(path, (hits.get(path) ?? 0) + 1);
    });
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-worker-edits-'));
    ({ app, win } = await launch(userData));
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it("serves an edited static import of a module worker (loaded as 'Other')", async () => {
    await goTo(win, url('/workers/'));
    await expect.poll(() => inSite('window.workerResults'), { timeout: 15_000 }).toEqual(ORIGINAL_RESULTS);
    await saveNewOverride(win, url('/workers/dep.js'), 'depValue', () => replaceEditorText(win, "export const depValue = 'patched-dep';"));
    await expect.poll(() => result('module'), { timeout: 15_000 }).toBe('patched-dep');
  });

  it("serves an edited first script of a dedicated worker, and it still starts its nested worker", async () => {
    await saveNewOverride(win, url('/workers/worker.js'), 'libValue', () =>
      typeAtEndOfEditor(win, "postMessage({ key: 'main', value: 'patched-worker' });"),
    );
    await expect.poll(() => result('main'), { timeout: 15_000 }).toBe('patched-worker');
    await expect.poll(() => result('worker')).toBe(ORIGINAL_RESULTS.worker);
    await expect.poll(() => result('nested')).toBe(ORIGINAL_RESULTS.nested);
  });

  it('serves an edited worklet module', async () => {
    await saveNewOverride(win, url('/workers/worklet.js'), 'registerProcessor', () =>
      typeAtEndOfEditor(win, "registerProcessor('patched-processor', class extends AudioWorkletProcessor { process() { return false; } });"),
    );
    await expect.poll(() => result('worklet'), { timeout: 15_000 }).toBe('patched');
  });

  it('serves an edited first script of a shared worker', async () => {
    await saveNewOverride(win, url('/workers/shared.js'), 'onconnect', () => typeAtEndOfEditor(win, "self.sharedLibValue = 'patched-shared-main';"));
    await expect.poll(() => result('shared'), { timeout: 15_000 }).toBe('patched-shared-main');
  });

  it("reinstalls a service worker whose own script was edited, on the save's reload", async () => {
    const installs = hits.get('/workers/sw.js') ?? 0;
    await saveNewOverride(win, url('/workers/sw.js'), 'swLibValue', () => typeAtEndOfEditor(win, "self.swLibValue = 'patched-sw-main';"));
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe('original-sw:patched-sw-main');
    expect(hits.get('/workers/sw.js') ?? 0).toBeGreaterThan(installs);
  });

  it('reinstalls it again when the override is edited again', async () => {
    const overrides = await win.locator('[data-override-id]').count();
    // The saved file's tab is still open, now showing the override.
    await typeAtEndOfEditor(win, "self.swLibValue = 'patched-again';");
    await win.keyboard.press('Control+S');
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe('original-sw:patched-again');
    expect(await win.locator('[data-override-id]').count()).toBe(overrides);
  });

  it('turning the override off brings back the live service worker, and on brings back the edit', async () => {
    await overrideRow('sw.js').getByRole('switch').click();
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe(ORIGINAL_RESULTS.sw);
    await overrideRow('sw.js').getByRole('switch').click();
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe('original-sw:patched-again');
  });

  it('keeps one entry per file, marked with its worker, and the worker count, across those reloads', async () => {
    await markDocument();
    await reloadPage();
    await expect.poll(() => inNewDocument('sw'), { timeout: 15_000 }).toBe('original-sw:patched-again');
    await expect.poll(() => listedFiles(win)).toEqual(workersPageFiles(site.url));
    expect(await win.getByTestId('resource-row').count()).toBe(Object.keys(workersPageFiles(site.url)).length);
    await expect.poll(() => win.getByTestId('status-workers').getAttribute('data-count')).toBe('6');
  });

  it('deleting the override brings back the live service worker', async () => {
    await overrideRow('sw.js').getByRole('button', { name: 'Delete override' }).click();
    await win.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => overrideRow('sw.js').count()).toBe(0);
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe(ORIGINAL_RESULTS.sw);
    // The other edits still apply.
    await expect.poll(() => result('module')).toBe('patched-dep');
    await expect.poll(() => result('shared')).toBe('patched-shared-main');
  });

  it("with the page not bypassing service workers, says when Chromium's update check brings back the live script, and Reload fixes it", async () => {
    await saveNewOverride(win, url('/workers/sw-lib.js'), 'swLibValue', () => typeAtEndOfEditor(win, "self.swLibValue = 'patched-sw-lib';"));
    await expect.poll(() => result('sw'), { timeout: 20_000 }).toBe('original-sw:patched-sw-lib');

    await win.getByTestId('rail-settings').click();
    await win.getByRole('switch', { name: 'Bypass service workers' }).click();
    await expect.poll(() => win.getByRole('switch', { name: 'Bypass service workers' }).getAttribute('aria-checked')).toBe('false');
    await win.getByTestId('rail-explorer').click();
    try {
      // Now a navigation goes through the service worker (the app's reloads bypass the cache and it), and
      // Chromium checks it for updates a moment later: it fetches its scripts out of the app's reach.
      await markDocument();
      await goTo(win, url('/workers/'));
      await expect.poll(() => inNewDocument('sw'), { timeout: 15_000 }).toBe('original-sw:patched-sw-lib');
      const toast = win.locator('[aria-label="Notifications"]').getByText('The service worker reinstalled the live sw-lib.js');
      await toast.waitFor({ timeout: 20_000 });
      expect(await askServiceWorker()).toBe(ORIGINAL_RESULTS.sw);
      // Its Reload installs the edit again.
      await markDocument();
      await win.locator('[aria-label="Notifications"]').getByRole('button', { name: 'Reload page' }).first().click();
      await expect.poll(() => inNewDocument('sw'), { timeout: 20_000 }).toBe('original-sw:patched-sw-lib');
      expect(await askServiceWorker()).toBe('original-sw:patched-sw-lib');
    } finally {
      await win.getByTestId('rail-settings').click();
      await win.getByRole('switch', { name: 'Bypass service workers' }).click();
      await win.getByTestId('rail-explorer').click();
    }
  });

  it('edits a file that a worker started by a cross-site iframe imports', async () => {
    await goTo(win, url('/workers-frame/'));
    const port = new URL(site.url).port;
    const frameLib = `http://localhost:${port}/workers/lib.js`;
    await expect.poll(() => result('worker'), { timeout: 15_000 }).toBe(ORIGINAL_RESULTS.worker);
    await expect.poll(() => fileRow(win, frameLib).getAttribute('data-worker')).toBe('worker');
    await saveNewOverride(win, frameLib, 'libValue', () => typeAtEndOfEditor(win, "self.libValue = 'patched-frame-lib';"));
    await expect.poll(() => result('worker'), { timeout: 15_000 }).toBe('patched-frame-lib');
    // Its nested worker still runs, and the edited worker.js of the other site doesn't apply here.
    await expect.poll(() => result('nested')).toBe(ORIGINAL_RESULTS.nested);
    expect(await inSite('window.workerResults.main ?? null')).toBeNull();
  });

  it("drops a page's workers' files when it navigates away, and its site's service worker's when it leaves the site", async () => {
    await goTo(win, url('/workers/'));
    await expect.poll(() => win.getByTestId('status-workers').getAttribute('data-count'), { timeout: 15_000 }).toBe('6');
    const workerFiles = () =>
      win.evaluate(`[...document.querySelectorAll('[data-testid="resource-row"][data-worker]')].map((row) => row.dataset.url).sort()`);
    // Another page of the site: Chromium keeps the site's service worker attached to it.
    await goTo(win, url('/'));
    await expect.poll(workerFiles, { timeout: 15_000 }).toEqual([url('/workers/sw-lib.js'), url('/workers/sw.js')]);
    await expect.poll(() => win.getByTestId('status-workers').getAttribute('data-count')).toBe('1');
    // Another site: nothing of the workers is left.
    const port = new URL(site.url).port;
    await goTo(win, `http://localhost:${port}/`);
    await expect.poll(workerFiles, { timeout: 15_000 }).toEqual([]);
    await expect.poll(() => win.getByTestId('status-workers').count()).toBe(0);
    await expect.poll(() => win.getByTestId('resource-row').count()).toBe(5);
  });
});
