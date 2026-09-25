/**
 * Drives network rules in the built app, so the CDP behaviour they rely on is
 * checked on Electron's own Chromium too: block a script from the file tree,
 * turn the rule off and on, undo a quick rule, remove a page's CSP, allow CORS
 * for an API (preflights included), keep an unapplied edit on its tab, keep
 * rules per workspace, delete one, and find them all again after a restart.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ElectronApplication, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ANALYTICS_JS_PATH, CORS_PATH, CSP_PATH, TRACK_APP_JS_PATH, TRACK_PATH } from '../fixtures/headersPages';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';
import { built, clickMenuItem, evalInSite, fileRow, goTo, launch } from '../helpers/electronApp';

const RELOAD_TIMEOUT = { timeout: 15_000 };

describe.skipIf(!built)('Network rules in the app', () => {
  let site: FixtureSite;
  let userData: string;
  let app: ElectronApplication;
  let win: Page;
  const inSite = (expr: string) => evalInSite(app, site.url, expr);
  const ruleRows = () => win.locator('[data-rule-id]');
  const menuItem = (name: string | RegExp) => win.getByRole('menuitem', { name });
  const apiPort = () => new URL(site.url).port;

  beforeAll(async () => {
    site = await startFixtureSite();
    userData = await mkdtemp(join(tmpdir(), 'console-editor-rules-e2e-'));
    ({ app, win } = await launch(userData));
  });

  afterAll(async () => {
    await app?.close();
    await site?.close();
    await rm(userData, { recursive: true, force: true, maxRetries: 5 });
  });

  it('blocks a script from the file tree, before it reaches the server', async () => {
    await goTo(win, `${site.url}${TRACK_PATH}`);
    await expect.poll(() => inSite('window.analyticsRan'), RELOAD_TIMEOUT).toBe(true);
    const hitsBefore = site.hits(ANALYTICS_JS_PATH);

    await fileRow(win, `${site.url}${ANALYTICS_JS_PATH}`).click({ button: 'right' });
    await menuItem('Block this request').click();
    await expect.poll(() => ruleRows().count()).toBe(1);
    // The page reloads by itself, without the script.
    await expect.poll(() => inSite('window.analyticsBlocked === true && window.analyticsRan === undefined && window.trackAppRan === true'), RELOAD_TIMEOUT).toBe(true);
    expect(site.hits(ANALYTICS_JS_PATH)).toBe(hitsBefore);
    // Still listed, marked blocked, and counted.
    await expect.poll(() => fileRow(win, `${site.url}${ANALYTICS_JS_PATH}`).getAttribute('data-blocked'), RELOAD_TIMEOUT).toBe('');
    await expect.poll(async () => Number(await ruleRows().first().getByTestId('rule-hits').textContent()), RELOAD_TIMEOUT).toBeGreaterThanOrEqual(1);
  });

  it('turning the rule off lets the script run again, and on blocks it', async () => {
    const toggle = ruleRows().first().getByRole('switch');
    await toggle.click();
    await expect.poll(() => inSite('window.analyticsRan'), RELOAD_TIMEOUT).toBe(true);
    await toggle.click();
    await expect.poll(() => inSite('window.analyticsBlocked === true && window.analyticsRan === undefined'), RELOAD_TIMEOUT).toBe(true);
  });

  it('undoes a quick rule from its toast', async () => {
    await fileRow(win, `${site.url}${TRACK_APP_JS_PATH}`).click({ button: 'right' });
    await menuItem('Block this request').click();
    await expect.poll(() => ruleRows().count()).toBe(2);
    // The newest toast's (the first block's may still be showing).
    await win.getByRole('button', { name: 'Undo' }).last().click();
    await expect.poll(() => ruleRows().count()).toBe(1);
    await expect.poll(() => inSite('window.trackAppRan === true && window.analyticsRan === undefined'), RELOAD_TIMEOUT).toBe(true);
  });

  it("removes a page's Content-Security-Policy, so its inline script runs", async () => {
    await goTo(win, `${site.url}${CSP_PATH}`);
    await expect.poll(() => inSite('window.extRan'), RELOAD_TIMEOUT).toBe(true);
    expect(await inSite('typeof window.inlineRan')).toBe('undefined');

    await fileRow(win, `${site.url}${CSP_PATH}`).click({ button: 'right' });
    await menuItem('Remove Content-Security-Policy').click();
    await expect.poll(() => ruleRows().count()).toBe(2);
    await expect.poll(() => inSite('window.inlineRan === true && window.extRan === true'), RELOAD_TIMEOUT).toBe(true);
  });

  it('allows cross-origin requests to an API, credentialed and preflighted', async () => {
    const apiText = () => inSite("document.getElementById('api').textContent");
    await goTo(win, `${site.url}${CORS_PATH}`);
    await expect.poll(apiText, RELOAD_TIMEOUT).toMatch(/^error:/);

    await win.getByTestId('rule-add').click();
    await menuItem('Allow cross-origin requests…').click();
    await win.getByTestId('rule-match-type').click();
    await win.getByRole('menuitemcheckbox', { name: /^glob/ }).click();
    await win.getByTestId('rule-match-pattern').fill(`http://localhost:${apiPort()}/headers/*`);
    await win.getByTestId('rule-submit').click();

    await expect.poll(() => ruleRows().count()).toBe(3);
    await expect.poll(apiText, RELOAD_TIMEOUT).toContain('"ok":true');
    // A PUT with a custom header needs a preflight, which the server refuses (405): the rule answers it.
    await expect.poll(() => inSite('putApi()'), RELOAD_TIMEOUT).toContain('"api":"put"');
  });

  it('keeps an unapplied edit on its tab, and File › Save (Ctrl/Cmd+S) applies it', async () => {
    const cspRule = ruleRows().filter({ hasText: 'csp.html' });
    await cspRule.click();
    const rulePage = win.getByTestId('rule-page');
    await rulePage.waitFor();
    await rulePage.getByTestId('header-add').click();
    await rulePage.getByTestId('header-name').last().fill('X-Edited-By-Rule');
    await rulePage.getByTestId('header-value').last().fill('yes');
    const ruleTab = win.locator('[role="tab"]', { hasText: 'csp.html' });
    await expect.poll(() => ruleTab.getAttribute('data-dirty')).not.toBeNull();

    // Another tab and back: the edit is still there.
    await fileRow(win, `${site.url}${CORS_PATH}`).click();
    await win.locator('[role="tab"][aria-selected="true"]', { hasText: 'cors.html' }).waitFor();
    await ruleTab.click();
    await expect.poll(() => win.getByTestId('header-name').last().inputValue()).toBe('X-Edited-By-Rule');

    // Ctrl/Cmd+S is the menu's accelerator (see clickMenuItem).
    expect(await clickMenuItem(app, 'Save')).toBe(true);
    await expect.poll(() => ruleTab.getAttribute('data-dirty')).toBeNull();
    // Applied: the rule now carries three header changes.
    await expect.poll(() => win.getByTestId('header-name').count()).toBe(3);

    // An edit left unapplied asks before its tab closes.
    await win.getByTestId('header-value').last().fill('no');
    await ruleTab.getByRole('button', { name: /^Close / }).click();
    const dialog = win.getByRole('alertdialog');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect.poll(() => ruleTab.count()).toBe(1);
  });

  it('keeps rules per workspace', async () => {
    const tiles = () => win.getByTestId('workspace-tile');
    await win.getByTestId('workspace-new').click();
    // The unapplied edit is asked about first.
    const dialog = win.getByRole('alertdialog');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Switch anyway' }).click();
    await expect.poll(() => tiles().nth(1).getAttribute('aria-current')).toBe('true');
    await expect.poll(() => ruleRows().count()).toBe(0);
    await goTo(win, `${site.url}${TRACK_PATH}`);
    await expect.poll(() => inSite('window.analyticsRan'), RELOAD_TIMEOUT).toBe(true);

    await tiles().first().click();
    await expect.poll(() => tiles().first().getAttribute('aria-current')).toBe('true');
    await expect.poll(() => ruleRows().count()).toBe(3);
    await goTo(win, `${site.url}${TRACK_PATH}`);
    await expect.poll(() => inSite('window.analyticsBlocked === true && window.analyticsRan === undefined'), RELOAD_TIMEOUT).toBe(true);
  });

  it('deletes a rule after asking', async () => {
    await ruleRows().filter({ hasText: '/headers/*' }).click({ button: 'right' });
    await menuItem('Delete rule').click();
    const dialog = win.getByRole('alertdialog');
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => ruleRows().count()).toBe(2);
  });

  it('keeps rules across a restart, blocking from the first load', async () => {
    await app.close();
    ({ app, win } = await launch(userData));
    await expect.poll(() => ruleRows().count()).toBe(2);
    await expect.poll(() => inSite('window.analyticsBlocked === true && window.analyticsRan === undefined'), RELOAD_TIMEOUT).toBe(true);
  });
});
