/**
 * A design laid over a page through CDP, against real Chromium, on a page whose CSP forbids images from anywhere:
 * drawn all the same (a canvas in an isolated world), restyled, kept after a reload (over the top document only,
 * not in its same-site frame), out of the pointer's way, and taken off.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureOverCdp } from '../../src/main/shots/capture';
import { OVERLAY_ELEMENT_ID } from '../../src/main/overlay/constants';
import { PageOverlay } from '../../src/main/overlay/PageOverlay';
import { DEFAULT_OVERLAY_SETTINGS } from '../../src/main/overlay/constants';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';
import { decodePng } from '../helpers/decodePng';
import { encodePng } from '../helpers/encodePng';

describe.skipIf(!chromiumAvailable)('design overlay in Chromium', () => {
  let server: Server;
  let chrome: ChromiumHarness;
  let page: Page;
  let transport: Awaited<ReturnType<ChromiumHarness['newPage']>>['transport'];
  let overlay: PageOverlay;
  const design = encodePng(200, 100, () => [255, 0, 0]).toString('base64');
  const opaque = { ...DEFAULT_OVERLAY_SETTINGS, opacity: 1, x: 10, y: 20 };
  const pixel = async (x: number, y: number) => decodePng((await captureOverCdp(transport, { area: 'viewport' })).bytes).at(x, y);

  beforeAll(async () => {
    server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-src 'self'" });
      // The page, with a same-site frame out of the way (bottom right), which must not get a design of its own.
      if (req.url === '/frame.html') return void res.end('<!doctype html><body style="margin:0;background:#00ff00">f</body>');
      res.end('<!doctype html><body style="margin:0;background:#0000ff"><button id="under" style="position:absolute;left:30px;top:40px;width:50px;height:30px">b</button><iframe src="/frame.html" style="position:absolute;left:300px;top:200px;width:80px;height:60px;border:0"></iframe></body>');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    chrome = await launchChromium();
    ({ page, transport } = await chrome.newPage());
    await page.setViewportSize({ width: 400, height: 300 });
    await transport.send('Page.enable');
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`);
    overlay = new PageOverlay(transport);
  });

  afterAll(async () => {
    await chrome?.close();
    await new Promise((r) => server?.close(r));
  });

  it('draws the design over the page where it is placed, although the CSP allows no images', async () => {
    await overlay.show(design, opaque, 200, 100);
    await expect.poll(() => pixel(15, 25)).toEqual([255, 0, 0, 255]);
    expect(await pixel(5, 5)).toEqual([0, 0, 255, 255]);
    expect(await pixel(215, 125)).toEqual([0, 0, 255, 255]);
  });

  it('lets the pointer through to the page under it', async () => {
    expect(await page.evaluate(() => document.elementFromPoint(50, 50)?.id)).toBe('under');
  });

  it('takes a new style: see-through, blended, moved, hidden', async () => {
    await overlay.restyle({ ...opaque, opacity: 0.5 }, 200, 100);
    const [r, , b] = await pixel(15, 25);
    expect(r).toBeGreaterThan(100);
    expect(b).toBeGreaterThan(100);
    await overlay.restyle({ ...opaque, blend: 'difference' }, 200, 100);
    // Red on blue, as a difference: magenta.
    expect(await pixel(15, 25)).toEqual([255, 0, 255, 255]);
    await overlay.restyle({ ...opaque, x: 100 }, 200, 100);
    expect(await pixel(15, 25)).toEqual([0, 0, 255, 255]);
    expect(await pixel(105, 25)).toEqual([255, 0, 0, 255]);
    await overlay.restyle({ ...opaque, hidden: true }, 200, 100);
    expect(await pixel(15, 25)).toEqual([0, 0, 255, 255]);
    await overlay.restyle(opaque, 200, 100);
  });

  it('is there again after a reload, with its latest style, and puts itself back when the page removes it', async () => {
    await overlay.restyle({ ...opaque, x: 50 }, 200, 100);
    await page.reload();
    await expect.poll(() => pixel(55, 25)).toEqual([255, 0, 0, 255]);
    expect(await pixel(15, 25)).toEqual([0, 0, 255, 255]);
    // The frame's new document ran the same scripts: it stays as it is.
    // (A reload waits for the frame's load too.)
    const frame = page.frames().find((f) => f.url().endsWith('/frame.html'))!;
    expect(await frame.evaluate((id) => !!document.getElementById(id), OVERLAY_ELEMENT_ID)).toBe(false);
    expect(await pixel(310, 210)).toEqual([0, 255, 0, 255]);
    await page.evaluate((id) => document.getElementById(id)?.remove(), OVERLAY_ELEMENT_ID);
    await expect.poll(() => page.evaluate((id) => !!document.getElementById(id), OVERLAY_ELEMENT_ID)).toBe(true);
  });

  it('blends as a difference with the white a page without a background shows, and gives the page its own back', async () => {
    const root = () => page.evaluate(() => document.documentElement.style.backgroundColor);
    await page.evaluate(() => document.body.style.setProperty('background', 'none'));
    await overlay.restyle({ ...opaque, blend: 'difference' }, 200, 100);
    // Red from white: cyan.
    expect(await pixel(15, 25)).toEqual([0, 255, 255, 255]);
    expect(await root()).toBe('rgb(255, 255, 255)');
    await overlay.restyle(opaque, 200, 100);
    expect(await root()).toBe('');
    await page.evaluate(() => document.body.style.setProperty('background', '#0000ff'));
  });

  it('comes off, and stays off after a reload', async () => {
    await overlay.remove();
    expect(await pixel(55, 25)).toEqual([0, 0, 255, 255]);
    await page.reload();
    expect(await page.evaluate((id) => !!document.getElementById(id), OVERLAY_ELEMENT_ID)).toBe(false);
    expect(await pixel(55, 25)).toEqual([0, 0, 255, 255]);
  });
});
