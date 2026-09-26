/// <reference lib="dom" />
/**
 * How the component inspector copes with large apps, in real Chromium: a React app and a Vue 3 app of
 * some 14,000 components (with a chain 1,500 deep in React, 300 in Vue), and stores holding 20,000 items (Redux Toolkit,
 * Pinia), bundled as production builds. Each check times what a user feels (a commit, a click, a hover,
 * a pick, a level of the tree) with the framework hooks off, installed but idle, and recording, prints
 * the medians, and fails past a budget set well above what a laptop measures, so only a real regression
 * (work growing with the whole page on a hot path) trips it. Run with `npm run test:perf`.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import type { Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { DEFAULT_SETTINGS, type AppEvent, type Settings } from '../../src/shared/types';
import { bundleApp } from '../helpers/bundleApp';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

const APPS = join(__dirname, 'apps');
const RUNS = 9;
const HOOKS_OFF: Settings = { ...DEFAULT_SETTINGS, frameworkHooks: false };
const results: Array<{ check: string; median: number; budget: number; unit: string }> = [];

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe.skipIf(!chromiumAvailable)('inspector performance on large apps', () => {
  let server: Server;
  let origin: string;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let services: FrameServices;
  let transport: Awaited<ReturnType<ChromiumHarness['newPage']>>['transport'];
  let events: AppEvent[];

  beforeAll(async () => {
    const routes = new Map<string, [string, string]>();
    for (const name of ['largeReact', 'largeVue', 'largeStores']) {
      const app = await bundleApp(join(APPS, `${name}.ts`), name, 'production');
      routes.set(`/${name}.js`, ['text/javascript', app.code]);
      routes.set(`/${name}.html`, ['text/html', `<!doctype html><title>${name}</title><div id="root"></div><script src="/${name}.js"></script>`]);
      routes.set(`/${name}.js.map`, ['application/json', app.map!]);
    }
    server = createServer((req, res) => {
      const route = routes.get(new URL(req.url ?? '/', 'http://x').pathname);
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': `${route[0]}; charset=utf-8` }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    chrome = await launchChromium();
  });

  afterAll(async () => {
    await chrome?.close();
    await new Promise((r) => server?.close(r));
    // On stderr, so it shows whether the checks pass or not.
    const rows = results.map((r) => `${r.check.padEnd(60)} ${`${r.median.toFixed(1)} ${r.unit}`.padStart(10)}   budget ${r.budget} ${r.unit}`);
    process.stderr.write(`\n${rows.join('\n')}\n`);
  });

  afterEach(async () => {
    interception.detach();
    await transport.detach();
    await page.close();
  });

  async function open(name: string, settings: Settings = DEFAULT_SETTINGS): Promise<void> {
    events = [];
    const opened = await chrome.newPage();
    page = opened.page;
    transport = opened.transport;
    services = new FrameServices(() => settings, (e) => events.push(e));
    interception = new PageInterception({ transport, getOverrides: () => [], getRules: () => [], getSettings: () => settings, emit: () => undefined, sessions: services });
    await interception.attach();
    await page.goto(`${origin}/${name}.html`);
    await page.locator('button').first().waitFor();
  }

  const record = (check: string, values: number[], budget: number, unit = 'ms') => {
    const value = median(values);
    results.push({ check, median: value, budget, unit });
    expect(value, check).toBeLessThan(budget);
  };

  /** Clicks a button `RUNS` times from the page, timing each until the task after it (React commits by then). */
  const clicks = (selector: string, settle = 50) =>
    page.evaluate(
      async ({ selector, runs, settle }) => {
        const times: number[] = [];
        for (let i = 0; i < runs; i++) {
          const button = document.querySelector<HTMLElement>(selector)!;
          const started = performance.now();
          button.click();
          await new Promise((r) => setTimeout(r, 0));
          times.push(performance.now() - started);
          await new Promise((r) => setTimeout(r, settle));
        }
        return times;
      },
      { selector, runs: RUNS, settle },
    );

  /** Picks an element with the pointer: how long until the hover is read, and until the pick is read. */
  async function pickTimes(selector: string): Promise<{ hover: number; pick: number }> {
    events = [];
    await services.inspector.startPicking();
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    const started = Date.now();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await waitFor(() => events.find((e) => e.type === 'inspect-hover' && e.hover));
    const hover = Date.now() - started;
    const clicked = Date.now();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await waitFor(() => events.find((e) => e.type === 'inspect-picked'));
    return { hover, pick: Date.now() - clicked };
  }

  for (const [framework, name] of [
    ['React', 'largeReact'],
    ['Vue', 'largeVue'],
  ] as const) {
    it(`${framework}: a commit of every row costs about the same with the hooks idle as without them`, async () => {
      await open(name, HOOKS_OFF);
      await clicks('#all');
      const off = await clicks('#all');
      await page.close();
      interception.detach();
      await transport.detach();
      await open(name);
      await clicks('#all');
      const idle = await clicks('#all');
      record(`${framework}: commit of 2,000 rows, hooks off`, off, 400);
      record(`${framework}: commit of 2,000 rows, hooks idle`, idle, Math.max(400, median(off) * 1.5));
    });

    it(`${framework}: hovering and picking deep in the table, and at the end of a deep chain`, async () => {
      await open(name);
      await clicks('#all');
      const before = await clicks('#all');
      await services.inspector.scan();
      const row = await pickTimes('#row-1500 b');
      await services.inspector.stopPicking();
      const deep = await pickTimes('#deep');
      // What picking leaves on (the DOM domain, the nodes it knows) mustn't tax the page's updates after.
      await clicks('#all');
      const after = await clicks('#all');
      record(`${framework}: hover a cell in the table`, [row.hover], 1000);
      record(`${framework}: pick a cell in the table`, [row.pick], 2000);
      record(`${framework}: hover the end of the deep chain`, [deep.hover], 1000);
      record(`${framework}: pick the end of the deep chain`, [deep.pick], 2000);
      // The Overlay domain left on after picking made these take over twice as long.
      record(`${framework}: commit of 2,000 rows, after picking`, after, Math.round(median(before) * 1.8));
    });

    it(`${framework}: the page stack, and the tree's top and a level of 2,000 rows`, async () => {
      await open(name);
      const scans: number[] = [];
      for (let i = 0; i < 3; i++) {
        const started = Date.now();
        await services.inspector.scan();
        scans.push(Date.now() - started);
      }
      record(`${framework}: page stack scan`, scans, 1500);
      const frameId = services.inspector.list()[0]!.frameId;
      const levels: number[] = [];
      let path: number[] = [];
      // Down the first child until a level lists the rows (the most a level lists).
      for (let depth = 0; depth < 8; depth++) {
        const started = Date.now();
        const level = await services.inspector.componentTree(frameId, path);
        levels.push(Date.now() - started);
        if (!level || level.nodes.length + level.more >= 2000) break;
        const next = level.nodes.findIndex((node) => node.children > 0 && node.name !== 'Nest');
        if (next < 0) break;
        path = [...path, next];
      }
      record(`${framework}: a level of the Components tree (slowest)`, [Math.max(...levels)], 2000);
    });
  }

  it('React: recording renders of a 2,000-row commit, and what a batch weighs', async () => {
    await open('largeReact');
    await services.inspector.recordRenders(true);
    await clicks('#all', 150);
    const recording = await clicks('#all', 150);
    await waitFor(() => events.filter((e) => e.type === 'renders-recorded').length >= RUNS * 2 || undefined);
    const batches = events.filter((e): e is Extract<AppEvent, { type: 'renders-recorded' }> => e.type === 'renders-recorded');
    const sizes = batches.map((b) => JSON.stringify(b.commits).length / 1024);
    record('React: commit of 2,000 rows, recording renders', recording, 600);
    record('React: a batch of recorded renders (KB)', sizes, 1024, 'KB');
    const one = await clicks('#one', 150);
    record('React: commit of one row, recording renders', one, 100);
  });

  it('Stores: a dispatch into 20,000 entities, and a Pinia action on 20,000 items, recorded or not', async () => {
    await open('largeStores');
    const reduxIdle = await clicks('#redux', 10);
    const piniaIdle = await clicks('#pinia', 10);
    await services.inspector.recordStores(true);
    await clicks('#pinia', 10);
    const reduxRecording = await clicks('#redux', 10);
    const piniaRecording = await clicks('#pinia', 10);
    await waitFor(() => events.filter((e) => e.type === 'stores-recorded').length > 0 || undefined);
    // Nothing recording costs anything once recording stops.
    await services.inspector.recordStores(false);
    const piniaAfter = await clicks('#pinia', 10);
    record('Stores: Redux dispatch, not recording', reduxIdle, 50);
    record('Stores: Redux dispatch, recording', reduxRecording, 80);
    record('Stores: Pinia action, not recording', piniaIdle, 80);
    record('Stores: Pinia action, recording', piniaRecording, 80);
    record('Stores: Pinia action, after recording stopped', piniaAfter, 80);
  });
});
