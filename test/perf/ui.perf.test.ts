/// <reference lib="dom" />
/**
 * How the app's own UI copes with what large apps record, in the built app: the Renders and Stores logs
 * fed batches at the pace recording sends them (up to 2,000 commits of 200 components; 1,000 store actions
 * with 50-call stacks; 2,000 requests with 20-call initiators), their places in a real bundle whose source
 * map the app traces them through. It measures how long the window's main thread is blocked (long tasks)
 * while the log is shown and fills, and how long the log takes to show. Run with `npm run test:perf` (it
 * builds first), on a display (`xvfb-run -a` on headless Linux).
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ElectronApplication, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { encodeEvent } from '../../src/shared/appEventWire';
import { IPC_CHANNEL } from '../../src/shared/ipcChannels';
import type { AppEvent, NetworkRequest, RenderCommit, StackFrame, StoreAction } from '../../src/shared/types';
import { bundleApp } from '../helpers/bundleApp';
import { goTo, launch, root } from '../helpers/electronApp';

const built = existsSync(join(root, 'out/main/index.js'));
const BATCHES = 20;
const BATCH_MS = 100;
const results: Array<{ check: string; value: number; budget: number; unit: string }> = [];

describe.skipIf(!built)('the UI with large recordings', () => {
  let server: Server;
  let bundleUrl: string;
  let lines: string[];
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

  beforeAll(async () => {
    const bundle = await bundleApp(join(__dirname, 'apps/largeReact.ts'), 'largeReact', 'production');
    lines = bundle.code.split('\n');
    const routes: Record<string, [string, string]> = {
      '/app.html': ['text/html', '<!doctype html><title>app</title><div id="root"></div><script src="/largeReact.js"></script>'],
      '/largeReact.js': ['text/javascript', bundle.code],
      '/largeReact.js.map': ['application/json', bundle.map!],
    };
    server = createServer((req, res) => {
      const route = routes[new URL(req.url ?? '/', 'http://x').pathname];
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': route[0] }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    bundleUrl = `${origin}/largeReact.js`;
    userData = await mkdtemp(join(tmpdir(), 'console-editor-perf-ui-'));
    ({ app, win } = await launch(userData));
    // A page from the same site, so the bundle is one the page loaded.
    await goTo(win, `${origin}/app.html`);
    await win.waitForTimeout(2000);
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
    const rows = results.map((r) => `${r.check.padEnd(64)} ${`${r.value.toFixed(0)} ${r.unit}`.padStart(9)}   budget ${r.budget} ${r.unit}`);
    process.stderr.write(`\n${rows.join('\n')}\n`);
  });

  /** A place in the bundle: one of `spread` columns along its longest line, so many functions trace to a few originals. */
  const place = (i: number, spread: number) => {
    const line = lines.reduce((best, text, index) => (text.length > lines[best]!.length ? index : best), 0);
    return { url: bundleUrl, line, column: Math.floor(((i % spread) * lines[line]!.length) / spread) };
  };
  const frame = (i: number, spread: number): StackFrame => ({ name: `f${i % spread}`, ...place(i, spread) });

  const commit = (id: number): RenderCommit => ({
    id,
    frameId: null,
    at: Date.now(),
    duration: null,
    trigger: { type: 'click', target: 'button#all' },
    action: null,
    components: Array.from({ length: 200 }, (_, i) => ({
      name: `C${i % 300}`,
      key: String(i),
      location: place(id * 7 + i, 300),
      kind: 'render',
      memo: false,
      duration: 0.1,
      reasons: [{ kind: 'props', changes: [{ name: 'tick', from: String(id - 1), to: String(id) }] }],
    })),
    more: 0,
  });
  const action = (id: number): StoreAction => ({
    id,
    frameId: null,
    at: Date.now(),
    store: 'Redux',
    library: 'redux',
    type: 'items/bumped',
    payload: String(id),
    changes: [{ path: `items.entities.${id}`, from: '{qty: 0}', to: '{qty: 1}' }],
    duration: 0.3,
    stack: Array.from({ length: 50 }, (_, i) => frame(id * 3 + i, 400)),
  });
  const request = (id: number): NetworkRequest => ({
    id: `r${id}`,
    url: `${bundleUrl.replace('largeReact.js', 'api')}/${id}`,
    method: 'GET',
    type: 'Fetch',
    state: 'done',
    status: 200,
    mimeType: 'application/json',
    startedAt: Date.now(),
    hasBody: false,
    pageLoad: 1,
    initiator: Array.from({ length: 20 }, (_, i) => frame(id * 5 + i, 500)),
  });

  /**
   * Sends app events to the editor's window as the main process does (`encodeEvent`). They reach the main
   * process as JSON: Playwright's own serializing of megabytes takes seconds.
   */
  const send = (events: AppEvent[]) =>
    app.evaluate(
      ({ BrowserWindow }, { json, channel }) => {
        const editor = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().endsWith('/renderer/index.html'))!;
        for (const event of JSON.parse(json) as unknown[]) editor.webContents.send(channel, event);
      },
      { json: JSON.stringify(events.map(encodeEvent)), channel: IPC_CHANNEL.onEvent },
    );

  /** Starts counting the window's long tasks (over 50 ms). */
  const watchLongTasks = () =>
    win.evaluate(() => {
      const w = window as unknown as { __longTasks: number[] };
      w.__longTasks = [];
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => w.__longTasks.push(entry.duration))).observe({ type: 'longtask' });
    });
  const longTasks = () => win.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks);

  /** The editor window's process's memory (MB). */
  const rendererMemory = () =>
    app.evaluate(({ app: electronApp, BrowserWindow }) => {
      const editor = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().endsWith('/renderer/index.html'))!;
      const metrics = electronApp.getAppMetrics().find((m) => m.pid === editor.webContents.getOSProcessId());
      return (metrics?.memory.workingSetSize ?? 0) / 1024;
    });

  /** Feeds `count` batches `BATCH_MS` apart, then lets the window settle; the long tasks meanwhile. */
  async function feed(batch: (index: number) => AppEvent): Promise<{ total: number; worst: number }> {
    await watchLongTasks();
    for (let i = 0; i < BATCHES; i++) {
      await send([batch(i)]);
      await win.waitForTimeout(BATCH_MS);
    }
    await win.waitForTimeout(3000);
    const tasks = await longTasks();
    return { total: tasks.reduce((a, b) => a + b, 0), worst: Math.max(0, ...tasks) };
  }

  const record = (check: string, value: number, budget: number, unit = 'ms') => {
    results.push({ check, value, budget, unit });
    expect(value, check).toBeLessThan(budget);
  };

  it('the Renders log fills with 2,000 commits of 200 components while it is shown', async () => {
    await send([{ type: 'renders-recording', recording: true }]);
    await win.keyboard.press('Control+K');
    await win.keyboard.type('Record renders');
    await win.getByRole('option', { name: /Stop recording renders/ }).click();
    await send([{ type: 'renders-recording', recording: true }]);
    await win.getByTestId('renders-panel').waitFor();
    const before = await rendererMemory();
    const { total, worst } = await feed((i) => ({ type: 'renders-recorded', commits: Array.from({ length: 100 }, (_, j) => commit(i * 100 + j + 1)) }));
    record('Renders log: main thread blocked while 2,000 commits arrive', total, 3000);
    record('Renders log: longest task', worst, 500);
    record('Renders log: window memory taken by 2,000 commits', (await rendererMemory()) - before, 600, 'MB');

    await watchLongTasks();
    const started = Date.now();
    await win.getByRole('tab', { name: 'By component' }).click({ timeout: 20_000 });
    await win.getByTestId('render-profile-row').first().waitFor({ timeout: 20_000 });
    record('Renders log: showing By component', Date.now() - started, 1500);
    await win.getByRole('tab', { name: 'Commits' }).click();
  });

  it('the Stores log fills with 1,000 actions with 50-call stacks while it is shown', async () => {
    await win.getByRole('tab', { name: 'Stores' }).click();
    await win.getByTestId('stores-panel').waitFor();
    const { total, worst } = await feed((i) => ({ type: 'stores-recorded', actions: Array.from({ length: 50 }, (_, j) => action(i * 50 + j + 1)) }));
    record('Stores log: main thread blocked while 1,000 actions arrive', total, 3000);
    record('Stores log: longest task', worst, 500);
  });

  it('the Network panel takes 2,000 requests with 20-call initiators', async () => {
    await win.getByRole('tab', { name: 'Network' }).click();
    const { total, worst } = await feed((i) => ({ type: 'network-requests', requests: Array.from({ length: 100 }, (_, j) => request(i * 100 + j)) }));
    record('Network: main thread blocked while 2,000 requests arrive', total, 3000);
    record('Network: longest task', worst, 500);
  });
});
