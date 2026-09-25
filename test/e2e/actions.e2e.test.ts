/**
 * Actions in the built app, on the fixture's services page: a shell with a
 * same-site nav iframe, and cart and billing iframes on sites of their own.
 * Cart's `addItem(sku)` posts to the shell, which relays it to billing, which
 * logs what it got: an action run in cart shows up as a billing row.
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

/** The console's rows as they read: where they came from, their frame chip's label and their text. */
const rows = (win: Page) =>
  win.$$eval('[data-testid=console-row]', (els) =>
    els.map((el) => ({ source: el.getAttribute('data-source'), frame: el.querySelector('[data-frame-chip]')?.textContent ?? '', text: (el as unknown as { innerText: string }).innerText })),
  );

/** How many rows say billing got an item. */
const billingGot = async (win: Page) => (await rows(win)).filter((r) => r.frame === 'billing' && r.text.includes('billing got')).length;

const actionRow = (win: Page, name: string) => win.getByTestId('action-row').filter({ hasText: name });

describe.skipIf(!built)('actions', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-actions-'));
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

  it('keeps code you ran in the console as an action for the frame it ran in', async () => {
    await expect.poll(async () => (await rows(win)).some((r) => r.frame === 'billing' && r.text.includes('billing ready')), { timeout: 20_000 }).toBe(true);
    await win.getByTestId('console-frame-picker').click();
    await win.getByRole('menuitemcheckbox', { name: 'cart' }).click();
    const prompt = win.getByTestId('console-prompt');
    await prompt.fill("addItem('A1')");
    await prompt.press('Enter');
    await expect.poll(() => billingGot(win), { timeout: 20_000 }).toBe(1);

    const input = win.locator('[data-testid=console-row][data-source=input]').filter({ hasText: "addItem('A1')" });
    await input.hover();
    await input.getByTestId('console-save-action').click();

    // The Actions view opens on the new action: the code, its frame, and a name from the code.
    await win.getByTestId('actions-panel').waitFor();
    const name = win.getByTestId('action-name');
    await expect.poll(() => name.inputValue()).toBe("addItem('A1')");
    await expect.poll(() => win.getByTestId('action-code').inputValue()).toBe("addItem('A1')");
    await expect.poll(() => win.getByTestId('action-target').innerText()).toBe('cart');
    await name.fill('Add A1');
    await name.press('Enter');

    await expect.poll(() => actionRow(win, 'Add A1').count()).toBe(1);
    await expect.poll(() => actionRow(win, 'Add A1').locator('[data-frame-chip]').innerText()).toBe('cart');
    await expect.poll(() => win.getByTestId('action-form').count()).toBe(0);
  });

  it('runs an action in its frame with one click, and another frame reacts', async () => {
    await win.getByTestId('console-clear').click();
    await expect.poll(async () => (await rows(win)).length).toBe(0);

    await actionRow(win, 'Add A1').getByTestId('action-run').click();
    await expect.poll(() => billingGot(win), { timeout: 20_000 }).toBe(1);
    const all = await rows(win);
    const ran = all.findIndex((r) => r.source === 'input' && r.text.includes("addItem('A1')"));
    expect(all[ran]!.frame).toBe('cart');
    expect(all.find((r) => r.text.includes('billing got'))!.text).toMatch(/billing got\s+\{"type":"add","sku":"A1"\}/);
    const result = actionRow(win, 'Add A1').getByTestId('action-result');
    await expect.poll(() => result.innerText()).toBe('undefined');
    expect(await result.getAttribute('data-failed')).toBeNull();
  });

  it('makes an action for a frame picked from the page, and shows what it threw', async () => {
    await win.getByTestId('action-new').click();
    await win.getByTestId('action-name').fill('Decline');
    await win.getByTestId('action-target').click();
    await win.getByRole('menuitemcheckbox', { name: 'billing' }).click();
    await win.getByTestId('action-code').fill("throw new Error('card declined')");
    await win.getByTestId('action-code').press('Control+Enter');
    await expect.poll(() => win.getByTestId('action-row').count()).toBe(2);

    await actionRow(win, 'Decline').getByTestId('action-run').click();
    const result = actionRow(win, 'Decline').getByTestId('action-result');
    await expect.poll(() => result.innerText()).toContain('card declined');
    expect(await result.getAttribute('data-failed')).toBe('true');
  });

  it('runs an action from the command palette', async () => {
    const before = await billingGot(win);
    await win.keyboard.press('Control+K');
    await win.keyboard.type('Add A1');
    await win.getByRole('option', { name: /Add A1/ }).click();
    await expect.poll(() => billingGot(win), { timeout: 20_000 }).toBe(before + 1);
  });

  it('changes an action, and deletes one once confirmed', async () => {
    const decline = actionRow(win, 'Decline');
    await decline.hover();
    await decline.getByRole('button', { name: 'Edit action' }).click();
    const name = win.getByTestId('action-name');
    await expect.poll(() => name.inputValue()).toBe('Decline');
    await name.fill('Decline card');
    await name.press('Enter');
    await expect.poll(() => actionRow(win, 'Decline card').count()).toBe(1);

    await actionRow(win, 'Decline card').click({ button: 'right' });
    await win.getByRole('menuitem', { name: 'Delete action' }).click();
    await win.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(() => win.getByTestId('action-row').count()).toBe(1);
  });

  it("keeps each workspace's own actions, across a restart", async () => {
    await app.close();
    ({ app, win } = await launch(userData));
    // The Actions view is open again, with the action.
    await expect.poll(() => actionRow(win, 'Add A1').count(), { timeout: 20_000 }).toBe(1);

    const tiles = () => win.getByTestId('workspace-tile');
    await win.getByTestId('workspace-new').click();
    await expect.poll(() => tiles().nth(1).getAttribute('aria-current')).toBe('true');
    await expect.poll(() => win.getByTestId('action-row').count()).toBe(0);
    await win.getByText('No actions yet').waitFor();

    await tiles().first().click();
    await expect.poll(() => tiles().first().getAttribute('aria-current')).toBe('true');
    await expect.poll(() => actionRow(win, 'Add A1').count()).toBe(1);
  });
});
