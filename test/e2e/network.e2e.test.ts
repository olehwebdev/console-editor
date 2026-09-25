/**
 * The Network panel and response overrides in the built app: see the page's requests, open one's
 * response, edit the JSON, save it and see the page change; then answer with another status from the
 * response row, and find the override (with its method) in the Explorer. Then breakpoints: pause a
 * request like the selected one, edit its response and send it, save one as an override, and fail
 * one held before it is sent. Then phase 3: patch the live response, quick edits, throttling, a
 * WebSocket's messages, and a HAR exported and imported back.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ElectronApplication, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BROKEN_PATH, CART_PATH, NETWORK_PATH } from '../fixtures/networkPages';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';
import { built, evalInSite, goTo, launch } from '../helpers/electronApp';

const RELOAD_TIMEOUT = { timeout: 15_000 };

/** The response the test saves: an empty cart. */
const EMPTY_CART = '{ "items": [], "total": 0 }';

/** What a held GraphQL response is changed to. */
const HELD_USER = '{ "data": { "user": { "name": "Held", "id": 1 } } }';
const SAVED_USER = '{ "data": { "user": { "name": "Saved", "id": 2 } } }';

/** Starts a call in the page without waiting for it (it may be held); `window.settled` gets what the page got. */
const start = (call: string) => `window.settled = undefined; ${call}.then((r) => { window.settled = r; }); true`;

describe.skipIf(!built)('Network panel and response overrides in the app', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  const inSite = (expr: string) => evalInSite(app, site.url, expr);
  const rows = () => win.getByTestId('network-row');
  const cartRow = () => rows().filter({ hasText: CART_PATH }).last();
  const settled = () => inSite('window.settled');
  const overrideRow = (text: string) => win.locator('[data-override-id]').filter({ hasText: text });
  const menuItem = (name: string | RegExp) => win.getByRole('menuitem', { name }).or(win.getByRole('menuitemcheckbox', { name }));
  const editorText = async () => (await win.locator('.monaco-editor .view-lines').textContent())?.replace(/\u00a0/g, ' ');

  /** Replaces the active editor's text. Pasted: typing would have the editor close each bracket as it opens. */
  async function replaceText(text: string): Promise<void> {
    await win.click('.monaco-editor .view-lines');
    await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), text);
    await win.keyboard.press('Control+A');
    await win.keyboard.press('Control+V');
    // The editor draws spaces as no-break spaces.
    await expect.poll(editorText).toBe(text);
  }

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

  it('pauses requests like the selected one; the edited response is sent to the page', async () => {
    await rows().filter({ hasText: 'GetUser' }).last().click();
    await win.getByTestId('network-pause-like').click();
    await expect.poll(() => win.getByTestId('network-breakpoints').getAttribute('aria-label')).toBe('Breakpoints (1 on)');

    expect(await inSite(start("tryGql('GetUser')"))).toBe(true);
    await expect.poll(() => win.getByTestId('held-header').textContent(), RELOAD_TIMEOUT).toContain('Paused at the response');
    await expect.poll(() => win.getByTestId('network-held-request').count()).toBe(1);
    await expect.poll(() => win.getByTestId('status-paused').textContent()).toContain('1 paused');
    expect(await settled()).toBeFalsy();

    await replaceText(HELD_USER);
    await win.getByTestId('held-status').fill('202');
    await win.getByTestId('held-send').click();
    await expect.poll(settled).toEqual({ status: 202, body: HELD_USER });
    await expect.poll(() => win.getByTestId('held-header').count()).toBe(0);
    expect(await win.getByTestId('network-held-request').count()).toBe(0);
  });

  it('saves a paused response as an override, which answers from then on', async () => {
    expect(await inSite(start("tryGql('GetUser')"))).toBe(true);
    await expect.poll(() => win.getByTestId('held-header').count(), RELOAD_TIMEOUT).toBe(1);
    await replaceText(SAVED_USER);
    await win.getByTestId('held-save').click();
    await expect.poll(settled).toEqual({ status: 200, body: SAVED_USER });

    // The tab is the override's now, and the override answers the next one without holding it.
    await expect.poll(() => win.getByTestId('file-header').textContent()).toContain('Override live');
    await expect.poll(() => win.locator('[data-override-id]').count()).toBe(2);
    expect(await inSite(start("tryGql('GetUser')"))).toBe(true);
    await expect.poll(settled).toEqual({ status: 200, body: SAVED_USER });
    expect(await win.getByTestId('held-header').count()).toBe(0);
  });

  it('holds a request before it is sent, from a breakpoint written in the menu, and fails it', async () => {
    await win.getByTestId('network-breakpoints').click();
    await win.getByTestId('breakpoint-match-pattern').fill(`*${CART_PATH}*`);
    await win.getByTestId('breakpoint-stage').click();
    await win.getByRole('menuitemcheckbox', { name: 'Before sending' }).click();
    await win.getByTestId('breakpoint-add').click();
    await expect.poll(() => win.getByTestId('breakpoint-row').count()).toBe(2);
    await win.keyboard.press('Escape');

    expect(await inSite(start('tryCart()'))).toBe(true);
    await expect.poll(() => win.getByTestId('held-header').textContent(), RELOAD_TIMEOUT).toContain('Paused before sending');
    expect(await win.getByTestId('held-url').inputValue()).toBe(`${site.url}${CART_PATH}`);
    await win.getByTestId('held-fail').click();
    await win.getByRole('menuitem', { name: 'Connection refused' }).click();
    await expect.poll(settled).toEqual({ error: 'TypeError' });

    // Removed, the next one goes through.
    await win.getByTestId('network-breakpoints').click();
    await win.getByTestId('breakpoint-row').last().getByRole('button', { name: 'Remove the breakpoint' }).click();
    await expect.poll(() => win.getByTestId('breakpoint-row').count()).toBe(1);
    await win.keyboard.press('Escape');
    expect(await inSite(start('tryCart()'))).toBe(true);
    await expect.poll(settled).toMatchObject({ status: 200 });
  });

  it('patches the live response with the saved edits', async () => {
    const cart = overrideRow('cart');
    await cart.getByRole('switch').click();
    await cart.getByTestId('override-method').click();
    await expect.poll(() => win.getByTestId('response-status').inputValue()).toBe('503');
    await win.getByTestId('response-status').fill('200');
    await win.getByRole('switch', { name: 'Patch live' }).click();
    await win.getByTestId('response-apply').click();
    await expect.poll(() => cart.getByTestId('override-patch').count()).toBe(1);
    // The live cart with the edit applied, written back compactly: not the saved text as typed.
    await expect.poll(() => inSite(`fetch('${CART_PATH}').then((r) => r.text())`), RELOAD_TIMEOUT).toBe('{"items":[],"total":0}');
  });

  it('lengthens every text with a quick edit, and the page gets it once saved', async () => {
    await overrideRow('GetUser').getByTestId('override-method').click();
    await expect.poll(editorText).toBe(SAVED_USER);
    await win.getByTestId('response-quick-edits').click();
    await menuItem('Lengthen every text').click();
    await expect.poll(editorText).toContain('"name": "Saved Lorem ipsum');
    await win.getByTestId('save-button').click();
    expect(await inSite(start("tryGql('GetUser').then((r) => JSON.parse(r.body).data.user.name)"))).toBe(true);
    await expect.poll(settled, RELOAD_TIMEOUT).toMatch(/^Saved Lorem ipsum/);
  });

  it('takes the page offline from the network speed menu, and back', async () => {
    const broken = start(`fetch('${BROKEN_PATH}').then((r) => ({ status: r.status }), (e) => ({ error: e.name }))`);
    await win.getByTestId('network-throttling').click();
    await menuItem('Offline').click();
    await expect.poll(() => win.getByTestId('status-throttling').textContent()).toBe('Offline');
    expect(await inSite(broken)).toBe(true);
    await expect.poll(settled).toEqual({ error: 'TypeError' });

    await win.getByTestId('network-throttling').click();
    await menuItem('No throttling').click();
    await expect.poll(() => win.getByTestId('status-throttling').count()).toBe(0);
    expect(await inSite(broken)).toBe(true);
    await expect.poll(settled).toEqual({ status: 500 });
  });

  it("lists a WebSocket and shows the messages it sent and got", async () => {
    expect(await inSite('openSocket()')).toBe(true);
    // Sent once the greeting is in, so the three come in a known order.
    await expect.poll(() => inSite('socketMessages.length')).toBe(1);
    expect(await inSite('socket.send("ping"), true')).toBe(true);
    await win.locator('[data-testid="network-group"][data-group="ws"]').click();
    await rows().filter({ hasText: '/network/socket' }).last().click();
    await win.getByRole('tab', { name: 'Messages' }).click();
    const messages = win.getByTestId('network-message');
    await expect.poll(() => messages.count()).toBe(3);
    expect(await messages.evaluateAll((els) => els.map((el) => el.getAttribute('data-direction')))).toEqual(['received', 'sent', 'received']);
    expect(await messages.nth(2).textContent()).toContain('{"echo":"ping"}');
    await win.locator('[data-testid="network-group"][data-group="fetch"]').click();
  });

  it('exports the requests shown as a HAR, and imports it back as overrides', async () => {
    const harPath = join(userData, 'requests.har');
    // Stand-ins for the native file dialogs, which Playwright can't drive.
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = (async () => ({ canceled: false, filePath: path })) as unknown as typeof dialog.showSaveDialog;
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [path] })) as unknown as typeof dialog.showOpenDialog;
    }, harPath);

    await win.getByTestId('network-har').click();
    await menuItem(/^Export these \d+ requests as HAR/).click();
    await expect.poll(async () => JSON.parse(await readFile(harPath, 'utf8').catch(() => '{}')).log?.entries?.length ?? 0, RELOAD_TIMEOUT).toBeGreaterThan(0);
    const har = JSON.parse(await readFile(harPath, 'utf8'));
    expect(har.log.entries.some((e: { request: { url: string } }) => e.request.url.includes(CART_PATH))).toBe(true);

    const before = await win.locator('[data-override-id]').count();
    // The export's menu is gone before the next opens.
    await expect.poll(() => win.getByRole('menu').count()).toBe(0);
    await win.getByTestId('network-har').click();
    await menuItem('Import a HAR as overrides…').click();
    await expect.poll(() => win.locator('[data-override-id]').count(), RELOAD_TIMEOUT).toBeGreaterThan(before);
  });
});
