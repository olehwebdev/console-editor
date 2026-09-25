/**
 * The page stack in the built app, on the fixture's stack page (what Vue with
 * Pinia, Angular, Next.js and webpack leave in a page): the status bar names the
 * UI libraries, and the Page stack lists each finding with its evidence.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';
import { STACK_PATH } from '../fixtures/stackPage';

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

describe.skipIf(!built)('page stack', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-e2e-stack-'));
    app = await electron.launch({ args: [...sandboxArgs, root], cwd: root, env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData } as Record<string, string> });
    win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
    await win.waitForSelector('body[data-ready]');
    const bar = win.getByTestId('address-bar');
    await bar.fill(`${site.url}${STACK_PATH}`);
    await bar.press('Enter');
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true });
  });

  it("names the page's UI libraries in the status bar, which opens the Page stack", async () => {
    const chip = win.getByTestId('status-stack');
    await expect.poll(() => chip.textContent(), { timeout: 20_000 }).toBe('Vue · Angular');
    await chip.click();
    await win.getByTestId('stack-page').waitFor();
  });

  it('lists what the frame runs, UI libraries first, with versions, builds and how each showed', async () => {
    const frame = win.getByTestId('stack-frame').filter({ hasText: STACK_PATH });
    const hits = frame.getByTestId('stack-hit');
    await expect.poll(() => hits.evaluateAll((els) => els.map((el) => el.getAttribute('data-library')))).toEqual(['vue', 'angular', 'next', 'pinia', 'webpack']);
    const vue = await hits.first().textContent();
    expect(vue).toContain('Vue 3.5.43');
    expect(vue).toContain('production');
    expect(vue).toContain('__vue_app__ on the element it is mounted on');
    expect(await frame.getByTestId('stack-hit').filter({ hasText: 'Next.js' }).textContent()).toContain('Next.js 15.1.0');
  });

  it('scans again when asked', async () => {
    await win.getByTestId('stack-scan').click();
    await expect.poll(() => win.getByTestId('stack-hit').count()).toBe(5);
  });
});
