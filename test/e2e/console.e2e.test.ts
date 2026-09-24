/**
 * The console in the built app, on the fixture's services page: a shell with a
 * same-site nav iframe, and cart and billing iframes on sites of their own.
 * Each frame logs as it starts; the shell relays cart's messages to billing.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';

const root = resolve(__dirname, '../..');
const built = existsSync(join(root, 'out/main/index.js'));
// Chromium's sandbox can't start as root (containers).
const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

async function waitFor<T>(fn: () => T | undefined, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function launch(userData: string): Promise<{ app: ElectronApplication; win: Page }> {
  const app = await electron.launch({
    args: [...sandboxArgs, root],
    cwd: root,
    env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string>,
  });
  const win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
  await win.waitForSelector('body[data-ready]');
  return { app, win };
}

/** The console's rows as they read: the frame chip's label and the row's text. */
const rows = (win: Page) =>
  win.$$eval('[data-testid=console-row]', (els) =>
    els.map((el) => ({ source: el.getAttribute('data-source'), frame: el.querySelector('[data-frame-chip]')?.textContent ?? '', text: (el as unknown as { innerText: string }).innerText })),
  );

/**
 * Waits for the first row that says `words` to carry `frame`'s label. Polled to
 * the end: a row can show before the workspace's frame names have loaded.
 */
async function expectRowFrame(win: Page, words: string, frame: string): Promise<void> {
  await expect.poll(async () => (await rows(win)).find((r) => r.text.includes(words))?.frame, { timeout: 20_000 }).toBe(frame);
}

describe.skipIf(!built)('console', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-console-'));
    ({ app, win } = await launch(userData));
    const bar = win.getByTestId('address-bar');
    await bar.fill(`${site.url}/services.html`);
    await bar.press('Enter');
    await win.getByTestId('console-toggle').click();
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true });
  });

  it("shows each frame's logs, from its first line, tagged with its frame", async () => {
    await expectRowFrame(win, 'shell ready', new URL(site.url).host);
    await expectRowFrame(win, 'nav ready', 'nav');
    await expectRowFrame(win, 'cart ready', 'cart');
    await expectRowFrame(win, 'billing ready', 'billing');
  });

  it("runs code in the frame you pick, and shows another frame's logs reacting to it", async () => {
    await win.getByTestId('console-frame-picker').click();
    await win.getByRole('menuitemcheckbox', { name: 'cart' }).click();
    const prompt = win.getByTestId('console-prompt');
    await prompt.fill('addItem(42)');
    await prompt.press('Enter');
    await expectRowFrame(win, 'billing got', 'billing');
    const all = await rows(win);
    const input = all.findIndex((r) => r.source === 'input' && r.text.includes('addItem(42)'));
    // Each logged value is its own element: the text breaks between them.
    const reaction = all.findIndex((r) => /billing got\s+\{"type":"add","sku":42\}/.test(r.text));
    expect(all[input]!.frame).toBe('cart');
    expect(input).toBeLessThan(reaction);
    // Timed from the code that caused it.
    expect(all[reaction]!.text).toMatch(/\+\d+ms/);
    await expect.poll(() => prompt.inputValue()).toBe('');
  });

  it('filters the rows to the frames you pick', async () => {
    await win.getByTestId('console-frame-filter').filter({ hasText: 'billing' }).click();
    await expect.poll(async () => [...new Set((await rows(win)).map((r) => r.frame))]).toEqual(['billing']);
    await win.getByRole('button', { name: 'All frames' }).click();
    await expect.poll(async () => new Set((await rows(win)).map((r) => r.frame)).size).toBeGreaterThan(1);
  });

  it('names a frame for the workspace, and keeps the name after a restart', async () => {
    await win.getByTestId('console-name-frame').click();
    const name = win.getByTestId('frame-name');
    await name.fill('Cart service');
    await name.press('Enter');
    await expectRowFrame(win, 'cart ready', 'Cart service');

    await app.close();
    ({ app, win } = await launch(userData));
    // The workspace reopens its page, and the console stays open.
    await expectRowFrame(win, 'cart ready', 'Cart service');
  });

  it('clears the rows', async () => {
    await expectRowFrame(win, 'billing ready', 'billing');
    await win.getByTestId('console-clear').click();
    await expect.poll(async () => (await rows(win)).length).toBe(0);
  });
});
