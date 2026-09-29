/**
 * Captures against real Chromium: what the viewport shows, the whole page (past the viewport, which stays as it
 * was; in parts, joined, past a texture's side), and an element picked in a cross-site frame (its own process and session), placed through its frame's
 * owner and captured where it is on the page.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { FrameServices } from '../../src/main/PageController/FrameServices';
import { captureOverCdp } from '../../src/main/shots/capture';
import { DEFAULT_SETTINGS, type AppEvent, type InspectedComponent, type Settings } from '../../src/shared/types';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';
import { decodePng } from '../helpers/decodePng';

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 15_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe.skipIf(!chromiumAvailable)('captures in Chromium', () => {
  let server: Server;
  let port: number;
  let chrome: ChromiumHarness;
  let page: Page;
  let transport: Awaited<ReturnType<ChromiumHarness['newPage']>>['transport'];
  let services: FrameServices;
  let interception: PageInterception;
  const events: AppEvent[] = [];
  const settings: Settings = { ...DEFAULT_SETTINGS };

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      const pages: Record<string, string> = {
        // A tall page: blue down to 1000 px, green below; a cross-site frame 300 px down, 100 in.
        '/shell.html': `<!doctype html><body style="margin:0"><div style="height:1000px;background:#0000ff"></div><div style="height:1400px;background:#00ff00"></div><iframe src="http://frame.localhost:${port}/frame.html" style="position:absolute;left:100px;top:300px;width:400px;height:300px;border:0"></iframe></body>`,
        // In it, a red box 50 px in and 60 down.
        '/frame.html': '<!doctype html><body style="margin:0;background:#ffffff"><div id="red" style="position:absolute;left:50px;top:60px;width:120px;height:80px;background:#ff0000"></div></body>',
      };
      const html = pages[path];
      if (!html) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': 'text/html' }).end(html);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    port = (server.address() as AddressInfo).port;
    chrome = await launchChromium();
    ({ page, transport } = await chrome.newPage());
    await page.setViewportSize({ width: 800, height: 600 });
    services = new FrameServices(() => settings, (e) => events.push(e));
    interception = new PageInterception({ transport, getOverrides: () => [], getRules: () => [], getSettings: () => settings, emit: () => undefined, sessions: services });
    await interception.attach();
    await page.goto(`http://127.0.0.1:${port}/shell.html`);
    await page.frameLocator('iframe').locator('#red').waitFor();
  });

  afterAll(async () => {
    interception?.detach();
    await chrome?.close();
    await new Promise((r) => server?.close(r));
  });

  it('captures what the viewport shows', async () => {
    const image = await captureOverCdp(transport, { area: 'viewport' });
    expect(image).toMatchObject({ width: 800, height: 600, scale: 1, viewport: { width: 800, height: 600 } });
    expect(decodePng(image.bytes).at(10, 10)).toEqual([0, 0, 255, 255]);
  });

  it('captures the whole page past the viewport, and leaves the viewport and scroll as they were', async () => {
    await page.evaluate(() => window.scrollTo(0, 700));
    // The document's width: the viewport's less its scrollbar.
    const documentWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const image = await captureOverCdp(transport, { area: 'page' });
    expect(image).toMatchObject({ width: documentWidth, height: 2400, scale: 1, viewport: { width: 800, height: 600 } });
    const png = decodePng(image.bytes);
    expect(png.at(10, 10)).toEqual([0, 0, 255, 255]);
    expect(png.at(10, 2300)).toEqual([0, 255, 0, 255]);
    // (The scrollbar can hide afterwards here: a quirk of Playwright's viewport emulation, which the app doesn't use.)
    expect(await page.evaluate(() => [window.innerWidth, window.innerHeight, window.scrollY])).toEqual([800, 600, 700]);
  });

  it('captures an element picked in a cross-site frame, where it is on the page', async () => {
    await page.evaluate(() => window.scrollTo(0, 100));
    await services.inspector.startPicking();
    const red = page.frameLocator('iframe').locator('#red');
    const box = (await red.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.click(box.x + 10, box.y + 10);
    const picked = await waitFor(() => events.find((e): e is Extract<AppEvent, { type: 'inspect-picked' }> => e.type === 'inspect-picked'));
    const { pickId } = picked.component as InspectedComponent;

    // 300 down and 100 in for the frame, 60 and 50 more for the box, 100 scrolled away: where the viewport shows it.
    expect(await services.inspector.elementBox(pickId)).toEqual({ x: 150, y: 260, width: 120, height: 80 });
    const image = await captureOverCdp(transport, { area: 'element', box: await services.inspector.elementBox(pickId) });
    expect(image).toMatchObject({ width: 120, height: 80 });
    const png = decodePng(image.bytes);
    for (const [x, y] of [[0, 0], [60, 40], [119, 79]]) expect(png.at(x, y)).toEqual([255, 0, 0, 255]);
  });

  it('captures a page taller than a texture in parts, joined without a gap or a repeat, down to the tallest a canvas draws', async () => {
    const tall = await chrome.newPage();
    try {
      await tall.page.setViewportSize({ width: 60, height: 600 });
      // 40,000 rows, each its own colour: its position, red the low byte and green the high one.
      await tall.page.setContent('<!doctype html><body style="margin:0"></body>');
      await tall.page.evaluate(() => {
        for (let y = 0; y < 40_000; y++) {
          const row = document.createElement('div');
          row.style.cssText = `height:1px;background:rgb(${y % 256},${y >> 8},0)`;
          document.body.append(row);
        }
      });
      const rowOf = (pixel: number[]) => pixel[0] + pixel[1] * 256;
      for (const scale of [1, 2]) {
        await tall.transport.send('Emulation.setDeviceMetricsOverride', { width: 60, height: 600, deviceScaleFactor: scale, mobile: false });
        const width = await tall.page.evaluate(() => document.documentElement.clientWidth);
        const image = await captureOverCdp(tall.transport, { area: 'page' });
        const cssHeight = Math.floor(32_767 / scale);
        expect(image).toMatchObject({ width: width * scale, height: cssHeight * scale, scale });
        const png = decodePng(image.bytes);
        const wrong = Array.from({ length: image.height }, (_, y) => y).filter((y) => rowOf(png.at(1, y)) !== Math.floor(y / scale));
        expect(wrong.slice(0, 5)).toEqual([]);
      }
    } finally {
      await tall.transport.detach();
      await tall.page.close();
    }
  });
});
