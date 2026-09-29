/**
 * Designs in the built app: importing a 2× design (its scale taken from its name), its page, comparing it with the
 * page captured at the design's width (how much differs, and where), the other ways to compare, changing its scale,
 * a design dropped on the shots menu, and a Figma frame brought in by its link from a stand-in for Figma's API.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Shot } from '../../src/shared/types';
import { encodePng } from '../helpers/encodePng';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const EDITOR_URL = /\/renderer\/index\.html$/;
const BLUE: [number, number, number] = [0, 0, 255];
const GREEN: [number, number, number] = [0, 255, 0];
const RED: [number, number, number] = [255, 0, 0];

/** Polls until `fn` returns a truthy value (usable outside tests, unlike expect.poll). */
async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe.skipIf(!built)('Designs', () => {
  let server: Server;
  let figma: Server;
  let dir: string;
  let app: ElectronApplication;
  let win: Page;
  let origin: string;

  /** The pixel at x, y of a shot's PNG, read in main. */
  const pixelOf = (id: string, x: number, y: number) =>
    app.evaluate(
      ({ nativeImage }, [dir, id, x, y]) => {
        const image = nativeImage.createFromPath(`${dir}/user-data/workspace/shots/${id}.png`);
        const bgra = image.toBitmap();
        const i = (y * image.getSize().width + x) * 4;
        return [bgra[i + 2], bgra[i + 1], bgra[i]];
      },
      [dir, id, x, y] as const,
    );
  const shots = () => win.evaluate(() => (window as unknown as { consoleEditor: { listShots(): Promise<Shot[]> } }).consoleEditor.listShots());
  const menu = () => win.getByTestId('shots-menu');

  beforeAll(async () => {
    // The page: 1200 CSS px of blue, then 1200 of green, no scrollbar to take room.
    server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><html style="scrollbar-width:none"><body style="margin:0"><div style="height:1200px;background:#0000ff"></div><div style="height:1200px;background:#00ff00"></div></body></html>');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    dir = await mkdtemp(join(tmpdir(), 'console-editor-e2e-designs-'));
    // The design, exported at 2×: 400 × 1400 CSS px, the page's colours but shorter, and a red 50 px box at 20, 20.
    const design = encodePng(800, 2800, (x, y) => (x >= 40 && x < 140 && y >= 40 && y < 140 ? RED : y < 2400 ? BLUE : GREEN));
    await writeFile(join(dir, 'hero@2x.png'), design);
    // Figma's API, as far as a frame's export goes: its name, then where its 2× render is (with the token asked for).
    figma = createServer((req, res) => {
      const { pathname } = new URL(req.url ?? '/', 'http://x');
      if (pathname === '/render.png') return void res.writeHead(200, { 'content-type': 'image/png' }).end(encodePng(60, 40, () => GREEN));
      if (req.headers['x-figma-token'] !== 'figd_good') return void res.writeHead(403, { 'content-type': 'application/json' }).end('{"status":403,"err":"Invalid token"}');
      const answers: Record<string, unknown> = { '/v1/files/AbC/nodes': { nodes: { '12:34': { document: { name: 'Checkout' } } } }, '/v1/images/AbC': { err: null, images: { '12:34': `${figmaApi}/render.png` } } };
      res.writeHead(pathname in answers ? 200 : 404, { 'content-type': 'application/json' }).end(JSON.stringify(answers[pathname] ?? {}));
    });
    await new Promise<void>((r) => figma.listen(0, '127.0.0.1', r));
    const figmaApi = `http://127.0.0.1:${(figma.address() as AddressInfo).port}`;

    app = await electron.launch({ args: [...sandboxArgs, root], cwd: root, env: { ...process.env, CONSOLE_EDITOR_USER_DATA: join(dir, 'user-data'), CONSOLE_EDITOR_FIGMA_API: figmaApi } as Record<string, string> });
    win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
    await win.waitForSelector('body[data-ready]');
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await win.getByTestId('address-bar').fill(`${origin}/`);
    await win.getByTestId('address-bar').press('Enter');
    await waitFor(() => app.evaluate(({ webContents }, o) => webContents.getAllWebContents().some((wc) => wc.getURL() === `${o}/` && !wc.isLoading()), origin));
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await new Promise((r) => figma?.close(r));
    await rm(dir, { recursive: true, force: true });
  });

  it('imports a design, its scale taken from its name', async () => {
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as unknown as typeof dialog.showOpenDialog;
    }, join(dir, 'hero@2x.png'));
    await win.getByTestId('shots-menu-button').click();
    await win.getByTestId('shots-import').click();
    await expect.poll(async () => (await shots()).length, { timeout: 15_000 }).toBe(1);
    expect((await shots())[0]).toMatchObject({ kind: 'design', name: 'hero@2x.png', width: 800, height: 2800, scale: 2, browser: null });
    await expect.poll(() => menu().getByTestId('shot-row').innerText()).toContain('Design · 400 wide');
  });

  it("compares it with the page captured at the design's width: how much differs, and where", async () => {
    const [design] = await shots();
    await menu().locator(`[data-shot-id="${design.id}"]`).click();
    await win.getByTestId('shot-page').waitFor();
    expect(await win.getByTestId('shot-scale-2').getAttribute('aria-pressed')).toBe('true');

    await win.getByTestId('shot-compare').click();
    await win.getByRole('menuitem', { name: 'The page now, 400 wide' }).click();
    await win.getByTestId('compare-page').waitFor({ timeout: 20_000 });
    const capture = (await shots()).find((s) => s.kind === 'capture')!;
    // The page at 400 CSS px and 2×: all of it, 2400 tall.
    expect(capture).toMatchObject({ area: 'page', width: 800, height: 4800, scale: 2 });
    expect(await win.getByTestId('compare-title').innerText()).toBe(`hero@2x.png ↔ ${capture.name}`);
    // The box, and the 1000 CSS px the page has past the design's end: 402,500 of 960,000 pixels, in two areas.
    await expect.poll(() => win.getByTestId('compare-stats').innerText(), { timeout: 20_000 }).toContain('41.9% of pixels differ');
    expect(await win.getByTestId('compare-stats').innerText()).toContain('2 areas');
  });

  it('shows them side by side, swiped and faded over each other too', async () => {
    await win.getByRole('tab', { name: 'Side by side' }).click();
    await expect.poll(() => win.getByTestId('compare-side').locator('img').count()).toBe(2);
    await win.getByRole('tab', { name: 'Swipe' }).click();
    await win.getByRole('slider', { name: 'Where the line is' }).waitFor();
    await win.getByRole('tab', { name: 'Onion skin' }).click();
    await win.getByRole('slider', { name: 'How opaque the top image is' }).waitFor();
  });

  it("changes a design's scale", async () => {
    const design = (await shots()).find((s) => s.kind === 'design')!;
    await win.getByTestId('shots-menu-button').click();
    await menu().locator(`[data-shot-id="${design.id}"]`).click();
    await win.getByTestId('shot-scale-1').click();
    await expect.poll(async () => (await shots()).find((s) => s.id === design.id)?.scale).toBe(1);
  });

  it('lays the design over the page at its width, keeps it out of captures and after a reload, and takes it off', async () => {
    const pageJs = (code: string) => app.evaluate(({ webContents }, [o, code]) => webContents.getAllWebContents().find((wc) => wc.getURL() === `${o}/`)!.executeJavaScript(code), [origin, code] as const);
    const overlayStyle = () => pageJs(`document.getElementById('__console-editor-overlay')?.style.cssText ?? null`) as Promise<string | null>;
    await win.getByTestId('shot-scale-2').click();
    await win.getByTestId('shot-overlay').click();
    await win.getByTestId('overlay-bar').waitFor();
    await expect.poll(overlayStyle).toContain('width: 400px');
    expect(await overlayStyle()).toContain('opacity: 0.5');
    // The page is laid out at the design's width.
    await expect.poll(() => pageJs('innerWidth')).toBe(400);

    await win.getByTestId('overlay-opacity').fill('1');
    await expect.poll(overlayStyle).toContain('opacity: 1');
    await win.getByTestId('overlay-difference').click();
    await expect.poll(overlayStyle).toContain('mix-blend-mode: difference');

    // A capture shows the page alone, at its own width; the design is back afterwards.
    const viewWidth = await app.evaluate(({ BrowserWindow, WebContentsView }, o) => {
      for (const w of BrowserWindow.getAllWindows()) {
        const view = w.contentView.children.find((v) => v instanceof WebContentsView && v.webContents.getURL() === `${o}/`);
        if (view) return view.getBounds().width;
      }
      return 0;
    }, origin);
    const capture = await win.evaluate(() => (window as unknown as { consoleEditor: { captureShot(area: string): Promise<Shot> } }).consoleEditor.captureShot('viewport'));
    expect(capture.width).toBe(viewWidth);
    expect(await pixelOf(capture.id, 30, 30)).toEqual([0, 0, 255]);
    await expect.poll(() => pageJs('innerWidth')).toBe(400);

    await pageJs('location.reload()');
    await expect.poll(overlayStyle, { timeout: 15_000 }).toContain('mix-blend-mode: difference');

    await win.getByTestId('overlay-remove').click();
    await expect.poll(overlayStyle).toBeNull();
    await expect.poll(() => pageJs('innerWidth')).toBe(viewWidth);
    expect(await win.getByTestId('overlay-bar').count()).toBe(0);
  });

  it('keeps an image dropped on the shots menu as a design', async () => {
    await win.getByTestId('shots-menu-button').click();
    const png = encodePng(20, 10, () => RED).toString('base64');
    await menu().evaluate((el, data) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'dropped.png', { type: 'image/png' }));
      el.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    }, png);
    await expect.poll(async () => (await shots()).map((s) => s.name)).toContain('dropped.png');
    expect((await shots()).find((s) => s.name === 'dropped.png')).toMatchObject({ kind: 'design', width: 20, height: 10, scale: 1 });
  });

  it('brings in a Figma frame by its link at 2×, asking for a token once, and forgets the token', async () => {
    if (!(await menu().count())) await win.getByTestId('shots-menu-button').click();
    await menu().getByTestId('shots-figma').click();
    const form = win.getByTestId('figma-form');
    await form.getByTestId('figma-link').fill('https://www.figma.com/design/AbC/Shop');
    await form.getByTestId('figma-import').click();
    await expect.poll(() => form.innerText()).toContain('Paste the link to a frame');
    await form.getByTestId('figma-link').fill('https://www.figma.com/design/AbC/Shop?node-id=12-34');
    await form.getByTestId('figma-token').fill('figd_bad');
    await form.getByTestId('figma-import').click();
    await expect.poll(() => form.getByTestId('figma-error').innerText()).toContain('Figma refused the token');
    await form.getByTestId('figma-token').fill('figd_good');
    await form.getByTestId('figma-import').click();
    // Kept as a design and opened.
    await expect.poll(async () => (await shots()).find((s) => s.name === 'Checkout@2x.png')).toMatchObject({ kind: 'design', width: 60, height: 40, scale: 2 });
    await win.getByTestId('shot-page').waitFor();
    // The token is kept: asked for no more, until forgotten.
    await win.getByTestId('shots-menu-button').click();
    await menu().getByTestId('shots-figma').click();
    await expect.poll(() => form.getByTestId('figma-token-saved').count()).toBe(1);
    await form.getByTestId('figma-forget').click();
    await form.getByTestId('figma-token').waitFor();
    expect(await win.evaluate(() => (window as unknown as { consoleEditor: { hasFigmaToken(): Promise<boolean> } }).consoleEditor.hasFigmaToken())).toBe(false);
  });
});
