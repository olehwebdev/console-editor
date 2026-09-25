/**
 * Finds and downloads source maps the way the app does, against a real
 * Chromium (via Playwright's CDP session) and the fixture site: the engine
 * records the SourceMap headers it sees, and the loader reads each bundle as
 * the server sent it and names its map every way there is.
 */
import { existsSync } from 'node:fs';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { InterceptionEngine } from '../../src/main/engine/InterceptionEngine';
import { loadSourceMap } from '../../src/main/sourceMap';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type EngineEvent, type Override, type Settings, type SourceMapFile, type SourceMapKind } from '../../src/shared/types';
import { MAIN_JS, MAIN_JS_PATH, startFixtureSite, type FixtureSite } from '../fixtures/site';
import { BOTH_JS_MAP, LEGACY_JS_MAP, MAIN_JS_MAP, MAPS_PATH, THEME_CSS_MAP, XSSI_JS_MAP } from '../fixtures/sourceMaps';

const browserAvailable = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

/** A found map's text, or null. */
const mapText = (file: SourceMapFile) => (file.status === 'found' && file.map.type === 'bytes' ? new TextDecoder().decode(file.map.bytes) : null);

describe.skipIf(!browserAvailable)('Source maps in Chromium', () => {
  let site: FixtureSite;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let engine: InterceptionEngine;
  let overrides: Override[];
  let settings: Settings;
  let events: EngineEvent[];
  /** What the loader downloaded. */
  let requested: string[];

  const load = (path: string, kind: SourceMapKind, known?: { bundleHash: string; mapUrl: string | null }) =>
    loadSourceMap(
      { bundleUrl: `${site.url}${path}`, kind, ...(known ? { known } : {}) },
      {
        content: (url) => engine.getResourceContent(url),
        fetch: (url, init) => {
          requested.push(url);
          return fetch(url, { signal: init.signal });
        },
        pageUrl: () => site.url,
      },
    );

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
    requested = [];
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
      getRules: () => [],
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

  it('records the SourceMap header of the hashed bundle', async () => {
    await page.goto(site.url);
    const content = await engine.getResourceContent(`${site.url}${MAIN_JS_PATH}`);
    expect(content.sourceMap).toBe('main.3f9a1c2b.js.map');
  });

  it("reports the upstream header of a bundle served from an override, which the page's response lacks", async () => {
    settings = { ...settings, stripSourceMaps: true };
    const bundleUrl = `${site.url}${MAIN_JS_PATH}`;
    overrides = [
      { id: 'o1', kind: 'Script', sourceUrl: bundleUrl, content: 'window.patched = 1;', match: defaultMatcherFor(bundleUrl), enabled: true, originalHash: null, createdAt: 0, updatedAt: 0 },
    ];
    await engine.refreshInterception();
    const served = page.waitForResponse((r) => r.url() === bundleUrl);
    await page.goto(site.url);
    expect((await served).headers().sourcemap).toBeUndefined();
    await expect.poll(() => page.evaluate('window.patched')).toBe(1);

    const content = await engine.getResourceContent(bundleUrl);
    expect(content).toMatchObject({ content: MAIN_JS, sourceMap: 'main.3f9a1c2b.js.map' });
    // The map describes the file as built, not the override.
    expect(await load(MAIN_JS_PATH, 'Script')).toMatchObject({ status: 'found', bundle: MAIN_JS });
  });

  it("finds the hashed bundle's map", async () => {
    await page.goto(site.url);
    const file = await load(MAIN_JS_PATH, 'Script');
    expect(file).toMatchObject({ status: 'found', bundle: MAIN_JS, mapUrl: `${site.url}${MAIN_JS_PATH}.map`, bundleHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(mapText(file)).toBe(MAIN_JS_MAP);
  });

  it('prefers the header for a script and the comment for a stylesheet', async () => {
    await page.goto(`${site.url}${MAPS_PATH.page}`);
    const both = await load(MAPS_PATH.both, 'Script');
    expect(both).toMatchObject({ status: 'found', mapUrl: `${site.url}/maps/both.js.map` });
    expect(mapText(both)).toBe(BOTH_JS_MAP);
    const theme = await load(MAPS_PATH.theme, 'Stylesheet');
    expect(theme).toMatchObject({ status: 'found', mapUrl: `${site.url}/maps/theme.css.map` });
    expect(mapText(theme)).toBe(THEME_CSS_MAP);
  });

  it('follows the deprecated X-SourceMap header', async () => {
    await page.goto(`${site.url}${MAPS_PATH.page}`);
    const legacy = await load(MAPS_PATH.legacy, 'Script');
    expect(legacy).toMatchObject({ status: 'found', mapUrl: `${site.url}/maps/legacy.js.map` });
    expect(mapText(legacy)).toBe(LEGACY_JS_MAP);
  });

  it('hands over an inline data: map without a request', async () => {
    await page.goto(`${site.url}${MAPS_PATH.page}`);
    const inline = await load(MAPS_PATH.inline, 'Script');
    expect(inline).toMatchObject({ status: 'found', mapUrl: null, map: { type: 'inline', dataUrl: expect.stringMatching(/^data:application\/json;charset=utf-8;base64,/) } });
    expect(requested).toEqual([]);
  });

  it('reports a missing map with its HTTP status, and the engine sees nothing wrong', async () => {
    await page.goto(`${site.url}${MAPS_PATH.page}`);
    expect(await load(MAPS_PATH.missing, 'Script')).toEqual({ status: 'failed', failure: 'http', detail: '404', mapUrl: `${site.url}/maps/missing.js.map` });
    expect(events.filter((e) => e.type === 'error')).toEqual([]);
  });

  it("returns an HTML fallback's and an XSSI-prefixed map's bytes as served", async () => {
    await page.goto(`${site.url}${MAPS_PATH.page}`);
    expect(mapText(await load(MAPS_PATH.html, 'Script'))).toMatch(/^<!doctype html>/);
    expect(mapText(await load(MAPS_PATH.xssi, 'Script'))).toBe(`)]}'\n${XSSI_JS_MAP}`);
  });

  it('answers unchanged, downloading nothing, for the bundle and map the renderer holds', async () => {
    await page.goto(site.url);
    const first = await load(MAIN_JS_PATH, 'Script');
    if (first.status !== 'found') throw new Error(first.status);
    requested = [];
    expect(await load(MAIN_JS_PATH, 'Script', { bundleHash: first.bundleHash, mapUrl: first.mapUrl })).toEqual({ status: 'unchanged' });
    expect(requested).toEqual([]);
    // Another build of the file is read again.
    expect(await load(MAIN_JS_PATH, 'Script', { bundleHash: '0'.repeat(64), mapUrl: first.mapUrl })).toMatchObject({ status: 'found' });
  });
});
