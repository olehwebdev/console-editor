/**
 * Helpers for end-to-end tests that drive the built Electron app with Playwright.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core';

export const root = resolve(__dirname, '../..');

/** Whether `npm run build` has produced the app (the e2e suites skip otherwise). */
export const built = existsSync(join(root, 'out/main/index.js'));

/** Chromium's sandbox can't start as root (containers). */
export const sandboxArgs = process.getuid?.() === 0 ? ['--no-sandbox'] : [];

/** Polls until `fn` returns a truthy value (usable outside tests, unlike expect.poll). */
async function waitFor<T>(fn: () => T | undefined, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function launch(userData: string, env: Record<string, string> = {}): Promise<{ app: ElectronApplication; win: Page }> {
  // No executablePath: Playwright then injects its loader, which Electron apps need.
  const app = await electron.launch({
    args: [...sandboxArgs, root],
    cwd: root,
    env: { ...process.env, CONSOLE_EDITOR_USER_DATA: userData, ...env } as Record<string, string>,
  });
  // The embedded website view is also a page; pick the editor UI.
  const win = await waitFor(() => app.windows().find((p) => p.url().endsWith('/renderer/index.html')));
  await win.waitForSelector('body[data-ready]');
  return { app, win };
}

/**
 * Evaluates `expr` in the website, or in the frame (at any depth, in any
 * process) whose hostname is `host`, through Electron's WebFrameMain.
 * Resolves undefined if the frame is replaced before it answers (a reload in
 * progress), so a polling caller simply tries again.
 */
export function evalInSite(app: ElectronApplication, siteUrl: string, expr: string, host?: string): Promise<unknown> {
  return app
    .evaluate(
      async ({ webContents }, [siteUrl, expr, host]) => {
        const wc = webContents.getAllWebContents().find((w) => w.getURL().startsWith(siteUrl as string));
        if (!wc) return undefined;
        const frame = host ? wc.mainFrame.framesInSubtree.find((f) => f.url && new URL(f.url).hostname === host) : wc.mainFrame;
        if (!frame) return undefined;
        const gone = new Promise((resolve) => setTimeout(resolve, 500, undefined));
        return Promise.race([frame.executeJavaScript(expr as string), gone]);
      },
      [siteUrl, expr, host] as const,
    )
    .catch(() => undefined);
}

export async function typeAtEndOfEditor(win: Page, text: string): Promise<void> {
  await win.click('.monaco-editor .view-lines');
  await win.keyboard.press('Control+End');
  await win.keyboard.press('Enter');
  await win.keyboard.type(text);
  await win.keyboard.press('Escape');
}

export async function goTo(win: Page, url: string): Promise<void> {
  const bar = win.getByTestId('address-bar');
  await bar.fill(url);
  await bar.press('Enter');
}

export const fileRow = (win: Page, url: string) => win.locator(`[data-testid="resource-row"][data-url="${url}"]`);

/**
 * Clicks the app menu item labelled `label` (at any depth), as its accelerator would. Key presses
 * Playwright sends go through DevTools input, which Chromium never hands to the browser's own
 * shortcuts when the page leaves them unhandled, so a menu accelerator can't be pressed from a test.
 */
export function clickMenuItem(app: ElectronApplication, label: string): Promise<boolean> {
  return app.evaluate(({ BrowserWindow, Menu }, label) => {
    const all = (items: Electron.MenuItem[]): Electron.MenuItem[] => items.flatMap((item) => [item, ...(item.submenu ? all(item.submenu.items) : [])]);
    const item = all(Menu.getApplicationMenu()?.items ?? []).find((i) => i.label === label);
    item?.click(undefined, BrowserWindow.getAllWindows()[0], undefined as never);
    return !!item;
  }, label);
}
