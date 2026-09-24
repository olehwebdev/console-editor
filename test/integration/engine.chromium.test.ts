/**
 * Runs the interception engine against a real Chromium (via Playwright's CDP
 * session) and a local fixture site. This is the proof that the approach works:
 * edited files are served in place of the originals, including gzip'd,
 * SRI-protected and cache-busted ones.
 */
import { existsSync } from 'node:fs';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { InterceptionEngine, sha256 } from '../../src/main/engine/InterceptionEngine';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type EngineEvent, type Override, type Settings } from '../../src/shared/types';
import { APP_JS, MAIN_JS_PATH, startFixtureSite, type FixtureSite } from '../fixtures/site';

const browserAvailable = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

let nextId = 1;
function makeOverride(partial: Partial<Override> & Pick<Override, 'kind' | 'sourceUrl' | 'content'>): Override {
  const now = Date.now();
  return {
    id: `o${nextId++}`,
    match: defaultMatcherFor(partial.sourceUrl),
    enabled: true,
    originalHash: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe.skipIf(!browserAvailable)('InterceptionEngine in Chromium', () => {
  let site: FixtureSite;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let engine: InterceptionEngine;
  let overrides: Override[];
  let settings: Settings;
  let events: EngineEvent[];

  beforeAll(async () => {
    site = await startFixtureSite();
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser?.close();
    await site?.close();
  });

  beforeEach(async () => {
    overrides = [];
    settings = { ...DEFAULT_SETTINGS };
    events = [];
    context = await browser.newContext();
    page = await context.newPage();
    const session = await context.newCDPSession(page);
    const transport: CdpTransport = {
      send: (method, params) => session.send(method as never, params as never) as never,
      on: (event, handler) => {
        session.on(event as never, handler);
        return () => session.off(event as never, handler);
      },
    };
    engine = new InterceptionEngine({
      transport,
      getOverrides: () => overrides,
      getSettings: () => settings,
      emit: (e) => events.push(e),
      fallbackFetch: async (url) => (await fetch(url)).text(),
    });
    await engine.attach();
  });

  afterEach(async () => {
    engine.detach();
    await context.close();
  });

  async function setOverrides(next: Override[]): Promise<void> {
    overrides = next;
    await engine.refreshInterception();
  }

  const appText = () => page.textContent('#app');
  const evalValue = (expr: string) => page.evaluate(expr);

  it('loads the site unmodified when there are no overrides', async () => {
    await page.goto(site.url);
    expect(await appText()).toBe('app: original');
    expect(await evalValue('window.mainValue')).toBe('original-main');
  });

  it('lists scripts, stylesheets and the document, and returns decoded upstream content', async () => {
    await page.goto(site.url);
    const urls = engine.listResources().map((r) => `${r.kind} ${new URL(r.url).pathname}`);
    expect(urls).toEqual(
      expect.arrayContaining(['Document /', 'Stylesheet /style.css', 'Script /app.js', `Script ${MAIN_JS_PATH}`, 'Script /lazy.js']),
    );
    const content = await engine.getResourceContent(`${site.url}/app.js`);
    expect(content.content).toBe(APP_JS); // gzip transparently decoded
    expect(content.hash).toBe(sha256(APP_JS));
  });

  it('serves an edited gzip + SRI-protected script (integrity stripped)', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: `${site.url}/app.js`, content: APP_JS.replace("'original'", "'patched'") }),
    ]);
    await page.goto(site.url);
    expect(await appText()).toBe('app: patched');
    const entry = engine.listResources().find((r) => r.url.endsWith('/app.js'));
    expect(entry?.overrideId).toBe(overrides[0].id);
    expect(events).toContainEqual({ type: 'override-served', overrideId: overrides[0].id, url: `${site.url}/app.js` });
  });

  it('is blocked by Subresource Integrity when SRI stripping is off', async () => {
    settings.stripIntegrity = false;
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: `${site.url}/app.js`, content: "window.appValue = 'patched';" }),
    ]);
    await page.goto(site.url);
    // The browser refuses to execute the edited script, so appValue is never set.
    expect(await evalValue('window.appValue')).toBeUndefined();
  });

  it('serves an edited script whose integrity is set at runtime by a loader', async () => {
    await page.goto(site.url);
    await page.waitForFunction("window.lazyValue === 'original-lazy'");

    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: `${site.url}/lazy.js`, content: "window.lazyValue = 'patched-lazy';" }),
    ]);
    await page.reload();
    await page.waitForFunction("window.lazyValue === 'patched-lazy'");
  });

  it('runtime-set integrity blocks the edit when SRI stripping is off', async () => {
    settings.stripIntegrity = false;
    await engine.applySettings();
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: `${site.url}/lazy.js`, content: "window.lazyValue = 'patched-lazy';" }),
    ]);
    const blocked = page.waitForEvent('console', (m) => /integrity/i.test(m.text()));
    await page.goto(site.url);
    await blocked;
    expect(await evalValue('window.lazyValue')).toBeUndefined();
  });

  it('matches cache-busted file names with a glob', async () => {
    await setOverrides([
      makeOverride({
        kind: 'Script',
        sourceUrl: `${site.url}${MAIN_JS_PATH}`,
        match: { type: 'glob', pattern: `${site.url}/static/js/main.*.js`, ignoreQuery: true },
        content: "window.mainValue = 'patched-main';",
      }),
    ]);
    await page.goto(site.url);
    expect(await evalValue('window.mainValue')).toBe('patched-main');
  });

  it('overrides stylesheets', async () => {
    await setOverrides([
      makeOverride({ kind: 'Stylesheet', sourceUrl: `${site.url}/style.css`, content: 'body { color: rgb(255, 0, 0); }' }),
    ]);
    await page.goto(site.url);
    expect(await evalValue('getComputedStyle(document.body).color')).toBe('rgb(255, 0, 0)');
  });

  it('overrides the HTML document itself', async () => {
    await setOverrides([
      makeOverride({ kind: 'Document', sourceUrl: `${site.url}/`, content: '<html><body><div id="app">replaced</div></body></html>' }),
    ]);
    await page.goto(site.url);
    expect(await appText()).toBe('replaced');
  });

  it('answers requests whose upstream is missing (404)', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: `${site.url}/missing.js`, content: 'window.missingValue = 42;' }),
    ]);
    await page.goto(site.url);
    await page.addScriptTag({ url: `${site.url}/missing.js` });
    expect(await evalValue('window.missingValue')).toBe(42);
  });

  it('reports when the upstream file changed since the override was created', async () => {
    await setOverrides([
      makeOverride({
        kind: 'Script',
        sourceUrl: `${site.url}/app.js`,
        content: "window.appValue = 'patched';",
        originalHash: sha256(APP_JS),
      }),
    ]);
    await page.goto(site.url);
    expect(events.some((e) => e.type === 'upstream-changed')).toBe(false);

    site.setBody('/app.js', `${APP_JS}// deployed again\n`);
    try {
      await page.reload();
      expect(events).toContainEqual({ type: 'upstream-changed', overrideId: overrides[0].id, url: `${site.url}/app.js` });
      expect(await appText()).toBe('app: loading'); // our override doesn't set #app text
    } finally {
      site.setBody('/app.js', APP_JS);
    }
  });

  it('strips sourceMappingURL from served overrides', async () => {
    await setOverrides([
      makeOverride({
        kind: 'Script',
        sourceUrl: `${site.url}${MAIN_JS_PATH}`,
        content: "window.mainValue = 'x';\n//# sourceMappingURL=main.js.map\n",
      }),
    ]);
    const bodies: string[] = [];
    page.on('response', async (r) => {
      if (r.url().endsWith('.js') && r.url().includes('/static/')) bodies.push(await r.text());
    });
    await page.goto(site.url);
    await page.waitForFunction("window.mainValue === 'x'");
    expect(bodies[0]).not.toContain('sourceMappingURL');
  });

  it('goes back to the original once the override is disabled', async () => {
    const o = makeOverride({ kind: 'Script', sourceUrl: `${site.url}/app.js`, content: "window.appValue = 'patched';" });
    await setOverrides([o]);
    await page.goto(site.url);
    expect(await evalValue('window.appValue')).toBe('patched');

    await setOverrides([{ ...o, enabled: false }]);
    await page.reload();
    expect(await appText()).toBe('app: original');
  });
});
