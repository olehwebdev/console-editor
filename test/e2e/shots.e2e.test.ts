/**
 * Captures in the built app: the shots menu at the toolbar's end (capturing what the page shows and the whole page,
 * searching, the kinds), a capture's page (its size, the pixel under the pointer, renaming it), capturing an element
 * picked in a cross-site frame (its pixels are the element's), deleting, captures kept per workspace and across a
 * restart, and the website's own window opening a capture in the editor.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Shot } from '../../src/shared/types';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const EDITOR_URL = /\/renderer\/index\.html$/;
const PAGE_WINDOW_URL = /\/renderer\/index\.html#page-window$/;

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

describe.skipIf(!built)('Captures', () => {
  let server: Server;
  let origin: string;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

  async function launch(): Promise<void> {
    app = await electron.launch({ args: [...sandboxArgs, root], cwd: root, env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string> });
    win = await waitFor(() => app.windows().find((p) => EDITOR_URL.test(p.url())));
    await win.waitForSelector('body[data-ready]');
  }

  /** The active workspace's shots, as main lists them. */
  const shots = () => win.evaluate(() => (window as unknown as { consoleEditor: { listShots(): Promise<Shot[]> } }).consoleEditor.listShots());

  /** The pixel at x, y of a shot's file, read in main. */
  const pixel = (id: string, x: number, y: number) =>
    app.evaluate(
      ({ nativeImage }, [dir, id, x, y]) => {
        const image = nativeImage.createFromPath(`${dir}/workspace/shots/${id}.png`);
        const { width } = image.getSize();
        const bgra = image.toBitmap();
        const i = (y * width + x) * 4;
        return [bgra[i + 2], bgra[i + 1], bgra[i]];
      },
      [userData, id, x, y] as const,
    );

  /** Mouse input into the page through its debugger, as Chromium's input goes (it reaches cross-site frames). */
  const mouse = (type: string, point: { x: number; y: number }, extra: Record<string, unknown> = {}) =>
    app.evaluate(
      ({ webContents }, [type, point, extra, origin]) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL().startsWith(`${origin}/shell.html`))!;
        return page.debugger.sendCommand('Input.dispatchMouseEvent', { type, ...point, ...extra });
      },
      [type, point, extra, origin] as const,
    );

  const menu = () => win.getByTestId('shots-menu');
  /** Closes the shots menu, and waits for it to be gone (opened again while it fades out, it would keep its search). */
  async function closeMenu(): Promise<void> {
    await win.keyboard.press('Escape');
    await expect.poll(() => menu().count()).toBe(0);
  }
  async function capture(what: string): Promise<void> {
    await win.getByTestId('shots-menu-button').click();
    await win.getByTestId('shots-capture').click();
    await win.getByRole('menuitem', { name: what }).click();
  }

  beforeAll(async () => {
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      const { port } = server.address() as AddressInfo;
      const pages: Record<string, string> = {
        '/shell.html': `<!doctype html><title>Shell</title><body style="margin:0"><div style="height:1200px;background:#0000ff"></div><div style="height:1200px;background:#00ff00"></div><iframe src="http://frame.localhost:${port}/frame.html" style="position:absolute;left:100px;top:200px;width:400px;height:300px;border:0"></iframe></body>`,
        '/frame.html': '<!doctype html><body style="margin:0;background:#ffffff"><div id="red" style="position:absolute;left:50px;top:60px;width:120px;height:80px;background:#ff0000"></div></body>',
      };
      if (!pages[path]) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': 'text/html' }).end(pages[path]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-shots-'));
    await launch();
    const bar = win.getByTestId('address-bar');
    await bar.fill(`${origin}/shell.html`);
    await bar.press('Enter');
    await waitFor(() => app.evaluate(({ webContents }, o) => webContents.getAllWebContents().some((wc) => wc.getURL() === `${o}/shell.html` && !wc.isLoading()), origin));
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(userData, { recursive: true, force: true });
  });

  it('captures what the page shows and the whole page from the shots menu, newest first', async () => {
    await win.getByTestId('shots-menu-button').click();
    await menu().getByText('No captures yet.', { exact: false }).waitFor();
    await closeMenu();

    await capture('What the page shows');
    await expect.poll(async () => (await shots()).length, { timeout: 15_000 }).toBe(1);
    await capture('The whole page');
    await expect.poll(async () => (await shots()).length, { timeout: 15_000 }).toBe(2);
    const [whole, shown] = await shots();
    expect(whole).toMatchObject({ kind: 'capture', area: 'page', height: 2400, browser: { id: 'app', name: 'Chromium' }, pageUrl: `${origin}/shell.html` });
    expect(whole.name).toMatch(/^127\.0\.0\.1-\d+-shell\.html-\d+-full\.png$/);
    expect(shown.area).toBe('viewport');
    expect(await pixel(whole.id, 5, 2300)).toEqual([0, 255, 0]);

    await win.getByTestId('shots-menu-button').click();
    await expect.poll(() => menu().getByTestId('shot-row').count()).toBe(2);
    expect(await menu().getByTestId('shot-row').first().getAttribute('data-shot-id')).toBe(whole.id);
    await menu().getByRole('textbox', { name: 'Search captures and designs' }).fill('full');
    await expect.poll(() => menu().getByTestId('shot-row').count()).toBe(1);
    await menu().getByRole('tab', { name: 'Designs' }).click();
    await menu().getByText('Nothing matches.').waitFor();
    await closeMenu();
  });

  it("opens a capture's page: its size, the pixel under the pointer, and renaming it", async () => {
    const [whole] = await shots();
    await win.getByTestId('shots-menu-button').click();
    await menu().locator(`[data-shot-id="${whole.id}"]`).click();
    const page = win.getByTestId('shot-page');
    await page.waitFor();
    await expect.poll(() => win.getByTestId('shot-footer').innerText()).toContain(`${whole.width} × ${whole.height} px`);

    await win.getByRole('button', { name: '100%' }).click();
    const image = win.getByTestId('shot-viewer').locator('img');
    const box = (await image.boundingBox())!;
    await win.mouse.move(box.x + 5, box.y + 5);
    await expect.poll(() => win.getByTestId('shot-pixel').innerText()).toContain('#0000ff');

    await win.getByTestId('shot-name').click();
    await win.getByTestId('shot-name-input').fill('checkout.png');
    await win.getByTestId('shot-name-input').press('Enter');
    await expect.poll(async () => (await shots())[0].name).toBe('checkout.png');
    await expect.poll(() => win.getByRole('tab', { name: /checkout\.png/ }).count()).toBe(1);
  });

  it('captures an element picked in a cross-site frame, with its own pixels', async () => {
    // Where the red box is in the page: the frame's box plus the box's in it.
    const target = await waitFor(() =>
      app.evaluate(async ({ webContents }, o) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL() === `${o}/shell.html`);
        const frame = page?.mainFrame.frames.find((f) => f.url.endsWith('/frame.html'));
        const box = (target: { executeJavaScript(code: string): Promise<unknown> } | undefined, selector: string) =>
          target?.executeJavaScript(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r && { x: r.x, y: r.y }; })()`) as Promise<{ x: number; y: number } | undefined>;
        const [outer, inner] = await Promise.all([box(page, 'iframe'), box(frame, '#red')]);
        return outer && inner ? { x: Math.round(outer.x + inner.x + 20), y: Math.round(outer.y + inner.y + 20) } : undefined;
      }, origin),
    );
    await capture('An element…');
    await expect.poll(() => win.getByTestId('pick-element').getAttribute('aria-pressed')).toBe('true');
    await mouse('mouseMoved', target);
    await mouse('mousePressed', target, { button: 'left', clickCount: 1 });
    await mouse('mouseReleased', target, { button: 'left', clickCount: 1 });
    await expect.poll(async () => (await shots()).length, { timeout: 15_000 }).toBe(3);
    const element = (await shots())[0];
    expect(element).toMatchObject({ area: 'element', width: 120 * element.scale, height: 80 * element.scale });
    expect(element.name).toMatch(/-element\.png$/);
    expect(await pixel(element.id, 1, 1)).toEqual([255, 0, 0]);
    expect(await pixel(element.id, element.width - 2, element.height - 2)).toEqual([255, 0, 0]);
  });

  it('deletes a capture from its page, closing it', async () => {
    const [element] = await shots();
    await win.getByTestId('shots-menu-button').click();
    await menu().locator(`[data-shot-id="${element.id}"]`).click();
    await win.getByTestId('shot-delete').click();
    await win.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => (await shots()).map((s) => s.id)).not.toContain(element.id);
    await expect.poll(() => win.getByRole('tab', { name: new RegExp(element.name.replaceAll('.', '\\.')) }).count()).toBe(0);
  });

  it('keeps captures per workspace, and across a restart', async () => {
    const tiles = () => win.getByTestId('workspace-tile');
    await win.getByTestId('workspace-new').click();
    await expect.poll(() => tiles().nth(1).getAttribute('aria-current')).toBe('true');
    await expect.poll(async () => (await shots()).length).toBe(0);
    await tiles().first().click();
    await expect.poll(() => tiles().first().getAttribute('aria-current')).toBe('true');
    await expect.poll(async () => (await shots()).length).toBe(2);

    await app.close();
    await launch();
    await expect.poll(async () => (await shots()).map((s) => s.name)).toEqual(['checkout.png', expect.stringMatching(/\.png$/)]);
  });

  it("opens a capture in the editor from the website's own window", async () => {
    await win.getByRole('region', { name: 'Website preview' }).getByRole('button', { name: 'Open in its own window' }).click();
    const own = await waitFor(() => app.windows().find((p) => PAGE_WINDOW_URL.test(p.url()) && !p.isClosed()));
    await own.waitForSelector('body[data-ready]');
    await own.getByTestId('shots-menu-button').click();
    await expect.poll(() => own.getByTestId('shot-row').count()).toBe(2);
    // No deleting there: it would ask, and that window has no dialogs.
    await own.getByTestId('shot-row').first().click();
    await expect.poll(() => win.getByTestId('shot-page').count(), { timeout: 10_000 }).toBe(1);
    await expect.poll(() => win.getByTestId('shot-name').innerText()).toBe('checkout.png');
  });
});
