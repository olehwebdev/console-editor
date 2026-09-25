/**
 * The data flow of a production React cart whose state lives in Redux Toolkit
 * (minified, with a source map), in the built app: its store actions recorded in
 * the Stores tab, each with what it changed and the line of the cart that
 * dispatched it; the React commit that followed naming the action; and a request
 * the cart sent, with the stack of the handler that sent it in the Network panel.
 */
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ElectronApplication, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bundleApp } from '../helpers/bundleApp';
import { built, evalInSite, goTo, launch, root } from '../helpers/electronApp';

const CART_FILE = 'reduxCart.ts';
/** The 1-based line of the cart's source that holds `text`. */
const lineOf = (text: string) => readFileSync(join(root, 'test/fixtures/apps', CART_FILE), 'utf8').split('\n').findIndex((line) => line.includes(text)) + 1;
const LOAD_TIMEOUT = { timeout: 15_000 };

describe.skipIf(!built)('data flow: store actions and who sent a request', () => {
  let server: Server;
  let origin: string;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  const inSite = (expr: string) => evalInSite(app, origin, expr);
  /** Runs a palette command by its name. */
  const command = async (name: string) => {
    await win.keyboard.press('Control+K');
    await win.keyboard.type(name);
    await win.getByRole('option', { name: new RegExp(name) }).click();
  };

  beforeAll(async () => {
    const cart = await bundleApp(CART_FILE, 'redux', 'production');
    const routes: Record<string, [string, string]> = {
      '/redux.html': ['text/html', '<!doctype html><title>cart</title><div id="root"></div><script src="/redux.js"></script>'],
      '/redux.js': ['text/javascript', cart.code],
      '/redux.js.map': ['application/json', cart.map!],
      '/api/checkout': ['application/json', '{"ok":true}'],
    };
    server = createServer((req, res) => {
      const route = routes[new URL(req.url ?? '/', 'http://x').pathname];
      if (!route) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': route[0] }).end(route[1]);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-data-flow-'));
    ({ app, win } = await launch(userData));
    await goTo(win, `${origin}/redux.html`);
    // The cart has rendered (expect.poll only runs inside a test).
    for (const deadline = Date.now() + LOAD_TIMEOUT.timeout; (await inSite('document.getElementById("count")?.textContent')) !== '0 items'; ) {
      if (Date.now() > deadline) throw new Error('The cart did not render');
      await new Promise((r) => setTimeout(r, 100));
    }
  });

  afterAll(async () => {
    await app?.close();
    await new Promise((r) => server?.close(r));
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it("records the store's actions from the palette: what each changed, and the cart's line that dispatched it", async () => {
    await command('Record store actions');
    await win.getByTestId('stores-panel').waitFor();
    await expect.poll(() => win.getByTestId('stores-record').getAttribute('aria-pressed')).toBe('true');
    // The palette shows the Stores tab.
    expect(await win.getByRole('tab', { name: 'Stores' }).getAttribute('aria-selected')).toBe('true');

    await inSite('document.getElementById("add-A1").click()');
    const action = win.getByTestId('store-action').first();
    await expect.poll(() => action.getByTestId('store-action-type').textContent(), LOAD_TIMEOUT).toBe('cart/added');
    expect(await action.textContent()).toContain('Redux');
    expect(await action.getByTestId('store-change').allInnerTexts()).toEqual([expect.stringMatching(/cart\.count\s+0 → 1/), expect.stringMatching(/cart\.skus\s+\(0\) \[\] → \(1\) \["A1"\]/)]);
    // Traced through the map, past Redux's own calls, to the handler.
    await expect.poll(() => action.getByTestId('code-link').first().textContent(), LOAD_TIMEOUT).toBe(`${CART_FILE}:${lineOf('dispatch(cart.actions.added(sku))')}`);

    await action.getByRole('button', { name: 'Show the stack' }).click();
    await expect.poll(() => action.getByTestId('call-stack').locator('li').count()).toBeGreaterThan(1);
  });

  it('names the action in the React commit that followed it', async () => {
    await command('Record renders');
    await win.getByTestId('renders-panel').waitFor();
    await inSite('document.getElementById("add-A1").click()');
    const commit = win.getByTestId('render-commit').first();
    // A click from a script commits after its event is over: the action is what names the commit.
    await expect.poll(() => commit.textContent(), LOAD_TIMEOUT).toContain('cart/added');
    expect(await commit.getByTestId('rendered-why').allInnerTexts()).toEqual([expect.stringMatching(/^store /)]);
  });

  it('shows the stack of the handler that sent a request, traced to the cart', async () => {
    await inSite('document.getElementById("checkout").click()');
    await win.getByRole('tab', { name: 'Network' }).click();
    const row = win.getByTestId('network-row').filter({ hasText: 'checkout' });
    await row.click(LOAD_TIMEOUT);
    const stack = win.getByTestId('call-stack');
    await expect.poll(() => stack.getByTestId('code-link').allInnerTexts(), LOAD_TIMEOUT).toContain(`${CART_FILE}:${lineOf("void fetch('/api/checkout'")}`);
  });
});
