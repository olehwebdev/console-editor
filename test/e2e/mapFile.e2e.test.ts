/**
 * In the built app: a production React cart whose bundle names no source map
 * (as when a build uploads its maps to an error tracker instead), picked, then
 * given its map from a file through **Load a source map…** (the system's file
 * dialog is stubbed in the main process), and forgotten again; and a plain
 * page's element, whose own listeners are what the Component page shows.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bundleApp } from '../helpers/bundleApp';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const CART_FILE = 'reactCart.ts';
const lineOf = (text: string) => readFileSync(join(root, 'test/fixtures/apps', CART_FILE), 'utf8').split('\n').findIndex((line) => line.includes(text)) + 1;
const PLAIN_HTML = '<!doctype html><title>plain</title><button id="buy">Buy</button><script>function onBuy() {} document.getElementById("buy").addEventListener("click", onBuy);</script>';

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

describe.skipIf(!built)('source maps from files, and plain listeners', () => {
  let server: Server;
  let origin: string;
  let dir: string;
  let app: ElectronApplication;
  let win: Page;

  /** Clicks an element of the page while picking: through the page's debugger, at the element's middle. */
  const pickIn = async (selector: string) => {
    const point = await waitFor(() =>
      app.evaluate(async ({ webContents }, selector) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL().startsWith('http://127.0.0.1') && !wc.isLoading());
        if (!page) return undefined;
        const box = (await page.executeJavaScript(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`)) as { x: number; y: number } | null;
        return box ?? undefined;
      }, selector),
    );
    await win.getByTestId('pick-element').click();
    await expect.poll(() => win.getByTestId('pick-element').getAttribute('aria-pressed')).toBe('true');
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
      await app.evaluate(({ webContents }, [type, point]) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL().startsWith('http://127.0.0.1'))!;
        return page.debugger.sendCommand('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
      }, [type, point] as const);
    await win.getByTestId('component-page').waitFor({ timeout: 15_000 });
  };
  const goTo = async (url: string) => {
    const bar = win.getByTestId('address-bar');
    await bar.fill(url);
    await bar.press('Enter');
  };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'console-editor-e2e-mapfile-'));
    const cart = await bundleApp(CART_FILE, 'react', 'production');
    // The bundle as a build that keeps its map to itself ships it: no reference to the map.
    const code = cart.code.replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n');
    await writeFile(join(dir, 'react.js.map'), cart.map!);
    const routes: Record<string, [string, string]> = {
      '/app.html': ['text/html', '<!doctype html><title>cart</title><div id="root"></div><script src="/react.js"></script>'],
      '/react.js': ['text/javascript', code],
      '/plain.html': ['text/html', PLAIN_HTML],
    };
    server = createServer((req, res) => {
      const route = routes[new URL(req.url ?? '/', 'http://x').pathname];
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': route[0] }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    app = await electron.launch({ args: [...sandboxArgs, root], cwd: root, env: { ...process.env, CONSOLE_EDITOR_USER_DATA: join(dir, 'data') } as Record<string, string> });
    win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
    await win.waitForSelector('body[data-ready]');
    // The system's file dialog answers with the map, as if the user picked it.
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as typeof dialog.showOpenDialog;
    }, join(dir, 'react.js.map'));
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(dir, { recursive: true, force: true });
  });

  it("gives a bundle with no source map one from a file: the component gets its name and file, until the map is forgotten", async () => {
    await goTo(`${origin}/app.html`);
    await pickIn('#add-A1');
    const card = win.getByTestId('component-source');
    await expect.poll(() => card.textContent(), { timeout: 15_000 }).toContain('Its bundle has no source map');
    const minified = await win.getByTestId('component-name').textContent();
    expect(minified).not.toBe('CartItem');

    await card.getByTestId('load-map-file').click();
    await expect.poll(() => win.getByTestId('component-name').textContent(), { timeout: 15_000 }).toBe('CartItem');
    await expect.poll(() => win.getByTestId('component-source-place').textContent()).toContain(`${CART_FILE}:${lineOf('function CartItem')}`);
    await expect.poll(() => card.getByTestId('forget-map-file').textContent()).toBe('Forget react.js.map');

    await card.getByTestId('forget-map-file').click();
    await expect.poll(() => win.getByTestId('component-name').textContent(), { timeout: 15_000 }).toBe(minified);
    await card.getByTestId('load-map-file').waitFor();
  });

  it("shows a plain page's element with the listeners on it, and where each is defined", async () => {
    await goTo(`${origin}/plain.html`);
    await pickIn('#buy');
    await win.getByTestId('component-no-framework').waitFor();
    const listener = win.getByTestId('component-listener');
    await expect.poll(() => listener.textContent()).toContain('click');
    expect(await listener.textContent()).toContain('onBuy');
    expect(await listener.getByTestId('code-link').textContent()).toBe('plain.html:1');
  });
});
