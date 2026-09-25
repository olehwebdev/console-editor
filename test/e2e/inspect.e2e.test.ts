/**
 * Picking an element in the built app: a production React cart (minified, with
 * a source map) framed from another site, so it runs in its own process. The
 * pointer and the click go through the page's own debugger, as Chromium's input
 * does (Electron's sendInputEvent isn't routed into a cross-site frame). The
 * Component page names the component and its file from the source map, and
 * opens either the original or the bundle there; the Inspect view's tree shows
 * the frame's components; a state value is set from the page; Renders records
 * why the cart rendered when it is clicked, and sums it up by component; and
 * the value set is kept as an action, which sets it again after a reload.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PICK_MENU_ID } from '../../src/main/inspector/constants';
import { bundleApp } from '../helpers/bundleApp';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

const CART_FILE = 'reactCart.ts';
/** The 1-based line of the cart's source that declares `text`. */
const lineOf = (text: string) => readFileSync(join(root, 'test/fixtures/apps', CART_FILE), 'utf8').split('\n').findIndex((line) => line.includes(text)) + 1;

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

const activeLine = (win: Page) => win.locator('.monaco-editor .line-numbers.active-line-number');

/** The text of the line the cursor is on: Monaco draws it at the same top as its number. */
async function cursorLineText(win: Page): Promise<string> {
  const style = await win.locator('.monaco-editor .margin-view-overlays > div', { has: win.locator('.active-line-number') }).getAttribute('style');
  const top = /top:\s*(\d+)px/.exec(style ?? '')?.[1];
  return (await win.locator(`.monaco-editor .view-line[style*="top:${top}px"]`).innerText()).replace(/ /g, ' ');
}

describe.skipIf(!built)('component inspector', () => {
  let server: Server;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  /** Where the first item's Add button is, in the page view. */
  let addButton: { x: number; y: number };

  /** Mouse input into the page, through its debugger. */
  const mouse = (type: string, extra: Record<string, unknown> = {}) =>
    app.evaluate(
      ({ webContents }, [type, point, extra]) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL().endsWith('/shell.html'))!;
        return page.debugger.sendCommand('Input.dispatchMouseEvent', { type, ...point, ...extra });
      },
      [type, addButton, extra] as const,
    );
  const click = async () => {
    await mouse('mousePressed', { button: 'left', clickCount: 1 });
    await mouse('mouseReleased', { button: 'left', clickCount: 1 });
  };
  /** The View menu's Pick an Element item, as its shortcut runs it. */
  const menuPick = () => app.evaluate(({ Menu }, id) => Menu.getApplicationMenu()!.getMenuItemById(id)!.click(), PICK_MENU_ID);
  const picking = () => win.getByTestId('pick-element').getAttribute('aria-pressed');
  /** The cart's text, from inside its frame. */
  const cartText = () =>
    app.evaluate(({ webContents }) => {
      const page = webContents.getAllWebContents().find((wc) => wc.getURL().endsWith('/shell.html'))!;
      return page.mainFrame.frames.find((f) => f.url.endsWith('/react.html'))!.executeJavaScript('document.querySelector(".cart-item").textContent') as Promise<string>;
    });

  beforeAll(async () => {
    const cart = await bundleApp(CART_FILE, 'react', 'production');
    const routes: Record<string, [string, string]> = {
      '/react.html': ['text/html', '<!doctype html><title>cart</title><div id="root"></div><script src="/react.js"></script>'],
      '/react.js': ['text/javascript', cart.code],
      '/react.js.map': ['application/json', cart.map!],
    };
    server = createServer((req, res) => {
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      const { port } = server.address() as AddressInfo;
      const route = path === '/shell.html' ? ['text/html', `<!doctype html><title>shell</title><p>shell</p><iframe src="http://cart.localhost:${port}/react.html"></iframe>`] : routes[path];
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': route[0] }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-inspect-'));
    app = await electron.launch({ args: [...sandboxArgs, root], cwd: root, env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string> });
    win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
    await win.waitForSelector('body[data-ready]');
    const bar = win.getByTestId('address-bar');
    await bar.fill(`http://127.0.0.1:${(server.address() as AddressInfo).port}/shell.html`);
    await bar.press('Enter');
    // The cart's frame box plus the button's box in it, once React rendered it.
    addButton = await waitFor(() =>
      app.evaluate(async ({ webContents }) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL().endsWith('/shell.html'));
        const frame = page?.mainFrame.frames.find((f) => f.url.endsWith('/react.html'));
        const box = (target: { executeJavaScript: (code: string) => Promise<unknown> } | undefined, element: string) =>
          target?.executeJavaScript(`(() => { const r = ${element}?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; })()`) as Promise<{ x: number; y: number; width: number; height: number } | null | undefined>;
        const [outer, inner] = await Promise.all([box(page, 'document.querySelector("iframe")'), box(frame, 'document.getElementById("add-A1")')]);
        return outer && inner ? { x: Math.round(outer.x + inner.x + inner.width / 2), y: Math.round(outer.y + inner.y + inner.height / 2) } : undefined;
      }),
    );
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(userData, { recursive: true, force: true });
  });

  it('picks from the page toolbar, showing the Inspect view with what is under the pointer', async () => {
    await win.getByTestId('pick-element').click();
    await win.getByTestId('inspect-panel').waitFor();
    await expect.poll(picking).toBe('true');
    await mouse('mouseMoved');
    const hover = win.getByTestId('inspect-hover');
    await expect.poll(() => hover.textContent(), { timeout: 10_000 }).toContain('<button#add-A1>');
    // Production names are the minifier's; the hover lists the chain as the page has it.
    expect(await hover.locator('li').count()).toBeGreaterThanOrEqual(3);
  });

  it('shows the picked component, named and placed by the source map, with what it holds', async () => {
    await click();
    const page = win.getByTestId('component-page');
    await page.waitFor({ timeout: 15_000 });
    await expect.poll(picking).toBe('false');
    await expect.poll(() => win.getByTestId('component-name').textContent(), { timeout: 15_000 }).toBe('CartItem');
    await expect.poll(() => win.getByTestId('component-source-place').textContent()).toContain(`${CART_FILE}:${lineOf('function CartItem')}`);
    await expect.poll(() => win.getByRole('tab', { name: /CartItem/ }).count()).toBe(1);
    expect(await page.getByTestId('component-props').textContent()).toContain('A1');
    expect(await page.getByTestId('component-state').textContent()).toContain('1');
    expect(await page.getByTestId('component-context').textContent()).toContain('"EUR"');
    await expect.poll(() => page.getByTestId('component-handlers').textContent()).toContain('handleAdd');
    expect(await page.getByTestId('component-chain-link').count()).toBeGreaterThanOrEqual(3);
  });

  it('opens the original read-only at the component, and the bundle where it runs', async () => {
    const source = win.getByTestId('component-source');
    await source.getByTestId('open-original').click();
    await expect.poll(() => win.getByTestId('source-header').textContent()).toContain('Read-only');
    await expect.poll(() => activeLine(win).textContent()).toBe(String(lineOf('function CartItem')));
    expect(await cursorLineText(win)).toContain('function CartItem(');

    await win.getByRole('tab', { name: /CartItem/ }).click();
    await source.getByTestId('go-to-bundle').click();
    await expect.poll(() => win.getByTestId('file-header').count()).toBe(1);
    await expect.poll(() => cursorLineText(win)).toMatch(/^\s*function [\w$]+\(/);
  });

  it('starts and stops picking from the View menu, and stops on Esc in the editor', async () => {
    await menuPick();
    await expect.poll(picking).toBe('true');
    await menuPick();
    await expect.poll(picking).toBe('false');
    await menuPick();
    await expect.poll(picking).toBe('true');
    await win.keyboard.press('Escape');
    await expect.poll(picking).toBe('false');
  });

  it("lists the cart frame's components in the Inspect view, down to the one picked, named by the source map", async () => {
    const rows = win.getByTestId('tree-row');
    await expect.poll(async () => (await rows.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ')), { timeout: 15_000 }).toEqual(['App', 'CartList', 'CartItem key=A1', 'CartItem key=B2']);
    expect(await rows.filter({ hasText: 'key=A1' }).getAttribute('aria-selected')).toBe('true');
    await rows.filter({ hasText: 'CartList' }).getByTestId('tree-toggle').click();
    await expect.poll(() => rows.count()).toBe(2);
  });

  it("sets a state value from the Component page, named after its variable, and the page renders it", async () => {
    await win.getByRole('tab', { name: /CartItem/ }).click();
    const qty = win.getByTestId('component-state').locator('[data-testid="component-value"][data-name="qty"]');
    await qty.waitFor({ timeout: 15_000 });
    await qty.hover();
    await qty.getByTestId('edit-state').click();
    await win.getByTestId('state-editor').fill('5');
    await win.getByTestId('state-editor').press('Enter');
    await expect.poll(() => qty.textContent()).toContain('5');
    await expect.poll(cartText).toContain('50 EUR');
  });

  it('records renders from the palette: a click in the page, and why each component rendered, also on the Component page', async () => {
    await win.keyboard.press('Control+K');
    await win.keyboard.type('Record renders');
    await win.getByRole('option', { name: /Record renders/ }).click();
    await win.getByTestId('renders-panel').waitFor();
    await expect.poll(() => win.getByTestId('renders-record').getAttribute('aria-pressed')).toBe('true');

    await click();
    const commit = win.getByTestId('render-commit').first();
    await expect.poll(() => commit.textContent(), { timeout: 15_000 }).toContain('click on button#add-A1');
    await expect.poll(() => commit.getByTestId('rendered-component').allInnerTexts()).toEqual([expect.stringMatching(/^CartItem\s*key=A1\s*state qty 5 → 6/)]);
    await expect.poll(() => win.getByTestId('component-render').count()).toBe(1);
  });

  it('sums the renders up by component: how often each rendered, and why', async () => {
    await win.getByRole('tab', { name: 'By component' }).click();
    const row = win.getByTestId('render-profile-row').filter({ hasText: 'CartItem' });
    await expect.poll(() => row.textContent(), { timeout: 15_000 }).toContain('state 1');
    expect(await row.getByTestId('code-link').textContent()).toBe(`${CART_FILE}:${lineOf('function CartItem')}`);
  });

  it('keeps the value set as an action of the cart frame, which sets it again once the page reloads', async () => {
    await win.getByRole('tab', { name: /CartItem/ }).click();
    const bar = win.getByTestId('saved-edit');
    await expect.poll(() => bar.textContent()).toContain('Set qty to 5');
    await bar.getByTestId('save-state-action').click();
    await win.getByTestId('actions-panel').waitFor();
    await expect.poll(() => win.getByTestId('action-name').inputValue()).toBe('Set qty of CartItem to 5');
    expect(await win.getByTestId('action-code').inputValue()).toContain('const selector = "#add-A1";');
    await win.getByTestId('action-save').click();
    const action = win.getByTestId('action-row').filter({ hasText: 'Set qty of CartItem to 5' });
    await action.waitFor();

    await app.evaluate(({ webContents }) => webContents.getAllWebContents().find((wc) => wc.getURL().endsWith('/shell.html'))!.reload());
    await expect.poll(() => cartText().catch(() => ''), { timeout: 15_000 }).toContain('10 EUR');
    await action.getByTestId('action-run').click();
    await expect.poll(cartText).toContain('50 EUR');
  });
});
