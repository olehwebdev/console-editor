/**
 * The Network panel and response overrides in the built app: see the page's requests, open one's
 * response, edit the JSON, save it and see the page change; then answer with another status from the
 * response row, and find the override (with its method) in the Explorer.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ElectronApplication, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CART_PATH, NETWORK_PATH } from '../fixtures/networkPages';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';
import { built, evalInSite, goTo, launch } from '../helpers/electronApp';

const RELOAD_TIMEOUT = { timeout: 15_000 };

/** The response the test saves: an empty cart. */
const EMPTY_CART = '{ "items": [], "total": 0 }';

describe.skipIf(!built)('Network panel and response overrides in the app', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  const inSite = (expr: string) => evalInSite(app, site.url, expr);
  const rows = () => win.getByTestId('network-row');
  const cartRow = () => rows().filter({ hasText: CART_PATH }).last();

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-network-e2e-'));
    ({ app, win } = await launch(userData));
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it("lists the page's fetch and GraphQL calls in the Network tab", async () => {
    await goTo(win, `${site.url}${NETWORK_PATH}`);
    await expect.poll(() => inSite('window.cart && window.cart.total'), RELOAD_TIMEOUT).toBe(19.75);

    await win.getByRole('button', { name: 'Show console' }).click();
    await win.getByRole('tab', { name: 'Network' }).click();
    await expect.poll(() => cartRow().count()).toBeGreaterThan(0);
    await expect.poll(() => rows().filter({ hasText: 'GetUser' }).count()).toBeGreaterThan(0);
    // Fetch/XHR only at first: the page's document shows once All is picked.
    expect(await rows().filter({ hasText: 'Document' }).count()).toBe(0);
    await win.locator('[data-testid="network-group"][data-group="all"]').click();
    await expect.poll(() => rows().filter({ hasText: 'Document' }).count()).toBeGreaterThan(0);
    await win.locator('[data-testid="network-group"][data-group="fetch"]').click();
  });

  it('opens a response, and saving an edit serves it to the page', async () => {
    await cartRow().click();
    await win.getByRole('tab', { name: 'Response' }).click();
    await expect.poll(() => win.getByTestId('network-response').textContent()).toContain('"Alpha"');

    await win.getByTestId('network-override').click();
    await expect.poll(() => win.getByTestId('file-header').textContent()).toContain('Live response');
    await expect.poll(() => win.getByTestId('response-method').textContent()).toBe('GET');

    await win.click('.monaco-editor .view-lines');
    // Pasted: typing would have the editor close each bracket as it opens.
    await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), EMPTY_CART);
    await win.keyboard.press('Control+A');
    await win.keyboard.press('Control+V');
    // The editor draws spaces as no-break spaces.
    await expect.poll(async () => (await win.locator('.monaco-editor .view-lines').textContent())?.replace(/\u00a0/g, ' ')).toBe(EMPTY_CART);
    await win.getByTestId('save-button').click();

    // The page reloads with the saved body.
    await expect.poll(() => inSite('window.cart && window.cart.items.length === 0 && window.cartStatus'), RELOAD_TIMEOUT).toBe(200);
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(1);
    expect(await win.getByTestId('override-method').textContent()).toBe('GET');
    // Its row in the Network tab says an override answered it.
    await expect.poll(() => cartRow().getByTestId('network-row-override').count(), RELOAD_TIMEOUT).toBe(1);
  });

  it('answers with another status once the response row is applied', async () => {
    await win.getByTestId('response-status').fill('503');
    await win.getByTestId('response-apply').click();
    await expect.poll(() => inSite('window.cartStatus'), RELOAD_TIMEOUT).toBe(503);
    await expect.poll(() => win.getByTestId('override-status').textContent()).toBe('503');
  });

  it('stops answering when the override is turned off', async () => {
    await win.locator('[data-override-id]').getByRole('switch').click();
    await expect.poll(() => inSite('loadCart().then((cart) => window.cartStatus === 200 && cart.total)'), RELOAD_TIMEOUT).toBe(19.75);
  });
});
