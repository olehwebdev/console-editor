/**
 * Iframe support against real Chromium. The fixture page on 127.0.0.1 embeds a
 * same-site iframe and a cross-site one (localhost) that itself embeds another
 * cross-site iframe (nested.localhost). With site isolation the cross-site
 * frames are separate CDP targets, reached through auto-attached sessions; the
 * tests assert those targets exist so a same-process fallback can't pass them.
 */
import type { Frame, Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sha256 } from '../../src/main/engine/InterceptionEngine';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type EngineEvent, type Override, type Settings } from '../../src/shared/types';
import { NESTED_JS, WIDGET_JS, startFixtureSite, type FixtureSite } from '../fixtures/site';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

let nextId = 1;
function makeOverride(partial: Partial<Override> & Pick<Override, 'kind' | 'sourceUrl' | 'content'>): Override {
  return {
    id: `f${nextId++}`,
    match: defaultMatcherFor(partial.sourceUrl),
    enabled: true,
    originalHash: null,
    createdAt: 0,
    updatedAt: nextId,
    ...partial,
  };
}

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 10_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe.skipIf(!chromiumAvailable)('iframes in Chromium', () => {
  let site: FixtureSite;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let detachTransport: () => Promise<void>;
  let overrides: Override[];
  let settings: Settings;
  let events: EngineEvent[];
  /** URLs read through the out-of-page fallback instead of a CDP session. */
  let fallbackFetches: string[];

  // Cross-site frames live on other hosts; same port.
  const widgetUrl = (path: string) => `http://localhost:${new URL(site.url).port}${path}`;
  const nestedUrl = (path: string) => `http://nested.localhost:${new URL(site.url).port}${path}`;
  const frame = (host: string): Promise<Frame> => waitFor(() => page.frames().find((f) => new URL(f.url() || 'about:blank').hostname === host));
  const evalIn = async (host: string, expr: string) => (await frame(host)).evaluate(expr);

  beforeAll(async () => {
    site = await startFixtureSite();
    chrome = await launchChromium();
  });

  afterAll(async () => {
    await chrome?.close();
    await site?.close();
  });

  beforeEach(async () => {
    fallbackFetches = [];
    overrides = [];
    settings = { ...DEFAULT_SETTINGS };
    events = [];
    const opened = await chrome.newPage();
    page = opened.page;
    detachTransport = () => opened.transport.detach();
    interception = new PageInterception({
      transport: opened.transport,
      getOverrides: () => overrides,
      getSettings: () => settings,
      emit: (e) => events.push(e),
      fallbackFetch: async (url) => {
        fallbackFetches.push(url);
        return (await fetch(url)).text();
      },
    });
    await interception.attach();
  });

  afterEach(async () => {
    interception.detach();
    await detachTransport();
    await page.close();
  });

  async function setOverrides(next: Override[]): Promise<void> {
    overrides = next;
    await interception.refreshInterception();
  }

  async function openFrames(): Promise<void> {
    await page.goto(`${site.url}/frames.html`);
    await waitFor(() => interception.targets().length === 2);
    await evalIn('nested.localhost', 'document.readyState');
  }

  it('attaches to the cross-site iframe and its nested iframe as separate targets', async () => {
    await openFrames();
    const targets = interception.targets();
    expect(targets).toHaveLength(2);
    const nested = targets.find((t) => t.parentTargetId);
    expect(nested?.parentTargetId).toBe(targets.find((t) => !t.parentTargetId)?.targetId);
    expect(await evalIn('localhost', 'window.widgetValue')).toBe('original-widget');
    expect(await evalIn('nested.localhost', 'window.nestedValue')).toBe('original-nested');
  });

  it('lists files loaded by every frame, labelling iframe ones', async () => {
    await openFrames();
    await waitFor(() => interception.listResources().some((r) => r.url === nestedUrl('/frames/nested.js')));
    const byUrl = new Map(interception.listResources().map((r) => [r.url, r]));

    expect(byUrl.get(`${site.url}/frames.html`)?.frame).toBeUndefined();
    // Same-site iframe: same session, but labelled as an iframe.
    expect(byUrl.get(`${site.url}/frames/same.js`)).toMatchObject({ frame: { url: `${site.url}/frames/same.html`, depth: 1 } });
    expect(byUrl.get(`${site.url}/frames/same.js`)?.iframeId).toBeUndefined();
    // The cross-site iframe's document is reported by its parent…
    expect(byUrl.get(widgetUrl('/frames/widget.html'))).toMatchObject({ kind: 'Document', frame: { url: widgetUrl('/frames/widget.html'), depth: 1 } });
    // …its subresources by its own target.
    const widgetJs = byUrl.get(widgetUrl('/frames/widget.js'));
    expect(widgetJs).toMatchObject({ kind: 'Script', frame: { url: widgetUrl('/frames/widget.html'), depth: 1 } });
    expect(widgetJs?.iframeId).toBeTruthy();
    expect(byUrl.get(widgetUrl('/frames/widget.css'))?.kind).toBe('Stylesheet');
    const nestedJs = byUrl.get(nestedUrl('/frames/nested.js'));
    expect(nestedJs).toMatchObject({ frame: { url: nestedUrl('/frames/nested.html'), depth: 2 } });
    expect(nestedJs?.iframeId).toBeTruthy();
    expect(nestedJs?.iframeId).not.toBe(widgetJs?.iframeId);
  });

  it('reads the content of a file that only an iframe loaded', async () => {
    await openFrames();
    await waitFor(() => interception.listResources().some((r) => r.url === widgetUrl('/frames/widget.js')));
    const content = await interception.getResourceContent(widgetUrl('/frames/widget.js'));
    expect(content.content).toBe(WIDGET_JS);
    expect(content.hash).toBe(sha256(WIDGET_JS));
    // Read from the iframe's session, not downloaded again.
    expect(fallbackFetches).toEqual([]);
  });

  it("reads a cross-site iframe's own HTML document (only its own session has the body)", async () => {
    await openFrames();
    const content = await interception.getResourceContent(widgetUrl('/frames/widget.html'));
    expect(content.content).toContain('<div id="widget">');
    expect(fallbackFetches).toEqual([]);
  });

  it('serves an edited script inside the cross-site iframe (despite its SRI hash)', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: widgetUrl('/frames/widget.js'), content: WIDGET_JS.replace("'original-widget'", "'patched-widget'") }),
    ]);
    await openFrames();
    expect(await evalIn('localhost', 'window.widgetValue')).toBe('patched-widget');
    await waitFor(async () => (await evalIn('localhost', "document.querySelector('#widget').textContent")) === 'widget: patched-widget');
    const entry = interception.listResources().find((r) => r.url === widgetUrl('/frames/widget.js'));
    expect(entry?.overrideId).toBe(overrides[0].id);
    expect(events.filter((e) => e.type === 'override-missed')).toEqual([]);
  });

  it('serves an edited script whose integrity the iframe sets at runtime', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: widgetUrl('/frames/widget-lazy.js'), content: "window.widgetLazyValue = 'patched-lazy';" }),
    ]);
    await openFrames();
    await waitFor(async () => (await evalIn('localhost', 'window.widgetLazyValue')) === 'patched-lazy');
  });

  it('serves edited files in a nested cross-site iframe', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: nestedUrl('/frames/nested.js'), content: NESTED_JS.replace("'original-nested'", "'patched-nested'") }),
    ]);
    await openFrames();
    expect(await evalIn('nested.localhost', 'window.nestedValue')).toBe('patched-nested');
  });

  it('serves an edited stylesheet inside the cross-site iframe', async () => {
    await setOverrides([makeOverride({ kind: 'Stylesheet', sourceUrl: widgetUrl('/frames/widget.css'), content: 'body { color: rgb(0, 128, 0); }' })]);
    await openFrames();
    await waitFor(async () => (await evalIn('localhost', 'getComputedStyle(document.body).color')) === 'rgb(0, 128, 0)');
  });

  it("replaces a cross-site iframe's HTML document (served by the parent session)", async () => {
    await setOverrides([
      makeOverride({ kind: 'Document', sourceUrl: widgetUrl('/frames/widget.html'), content: '<!doctype html><div id="widget">replaced widget</div>' }),
    ]);
    await page.goto(`${site.url}/frames.html`);
    await waitFor(async () => (await evalIn('localhost', "document.querySelector('#widget')?.textContent")) === 'replaced widget');
  });

  it('serves edited files in a same-site iframe', async () => {
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: `${site.url}/frames/same.js`, content: "window.sameValue = 'patched-same';" })]);
    await page.goto(`${site.url}/frames.html`);
    const same = await waitFor(() => page.frames().find((f) => f.url().endsWith('/frames/same.html')));
    await waitFor(async () => (await same.evaluate('window.sameValue')) === 'patched-same');
  });

  it('applies overrides added while the iframe is already open (fan-out to live targets)', async () => {
    await openFrames();
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: widgetUrl('/frames/widget.js'), content: "window.widgetValue = 'late';" })]);
    await (await frame('localhost')).evaluate('location.reload()');
    await waitFor(async () => (await evalIn('localhost', 'window.widgetValue').catch(() => undefined)) === 'late');
  });

  it('serves one override to the page and to the iframe that load the same URL', async () => {
    const shared = `${site.url}/frames/shared.js`;
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: shared, content: "window.sharedValue = 'patched-shared';" })]);
    await openFrames();
    expect(await page.evaluate('window.sharedValue')).toBe('patched-shared');
    expect(await evalIn('localhost', 'window.sharedValue')).toBe('patched-shared');
    const served = events.filter((e) => e.type === 'override-served' && e.url === shared);
    expect(served.length).toBeGreaterThanOrEqual(2);
    // Listed once per reporting session; the page's entry is the one without an iframe.
    const entries = interception.listResources().filter((r) => r.url === shared);
    expect(entries.some((r) => !r.frame && !r.iframeId && r.overrideId === overrides[0].id)).toBe(true);
  });

  it('drops a target (and its nested one) when the iframe is removed, without leaving anything hanging', async () => {
    await openFrames();
    const [widgetTarget] = interception.targets().filter((t) => !t.parentTargetId);
    await page.evaluate("document.querySelector('#widget').remove()");
    await waitFor(() => interception.targets().length === 0);
    const start = Date.now();
    await interception.refreshInterception();
    expect(Date.now() - start).toBeLessThan(1000);
    expect(events.some((e) => e.type === 'error')).toBe(false);
    const detached = events.filter((e) => e.type === 'iframe-detached').map((e) => (e as { iframeId: string }).iframeId);
    expect(detached).toContain(widgetTarget.sessionId);
    expect(detached).toHaveLength(2);
    expect(interception.listResources().some((r) => r.iframeId)).toBe(false);
  });

  it('resets only the iframe’s own list when it navigates within its site', async () => {
    await openFrames();
    const widget = interception.targets().find((t) => !t.parentTargetId)!;
    await (await frame('localhost')).evaluate("location.href = '/frames/widget2.html'");
    await waitFor(() => interception.listResources().some((r) => r.url === widgetUrl('/frames/widget2.js')));
    expect(events).toContainEqual({ type: 'navigated', url: widgetUrl('/frames/widget2.html'), iframeId: widget.sessionId });
    const urls = interception.listResources().map((r) => r.url);
    expect(urls).not.toContain(widgetUrl('/frames/widget.js'));
    expect(urls).toContain(`${site.url}/frames/same.js`);
    // Same target, and the nested frame (gone with the old page) was detached.
    expect(interception.targets().map((t) => t.targetId)).toEqual([widget.targetId]);
  });

  it('re-attaches after a top-level reload and keeps serving overrides', async () => {
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: nestedUrl('/frames/nested.js'), content: "window.nestedValue = 'patched-nested';" })]);
    await openFrames();
    for (let i = 0; i < 3; i++) {
      const before = interception.targets().map((t) => t.sessionId);
      await page.reload();
      await waitFor(() => interception.targets().length === 2 && interception.targets().every((t) => !before.includes(t.sessionId)));
      await waitFor(async () => (await evalIn('nested.localhost', 'window.nestedValue').catch(() => undefined)) === 'patched-nested');
    }
    expect(events.filter((e) => e.type === 'error')).toEqual([]);
  });

  it('never fails silently when an iframe navigates back to the top page’s site (a Chromium gap)', async () => {
    const back = `${site.url}/frames/back.js`;
    await setOverrides([makeOverride({ kind: 'Script', sourceUrl: back, content: "window.backValue = 'patched-back';" })]);
    await openFrames();
    await (await frame('localhost')).evaluate(`location.href = '${site.url}/frames/back.html'`);
    // Chromium may or may not intercept this first load; either way the user hears about it.
    await waitFor(() => events.some((e) => (e.type === 'override-served' || e.type === 'override-missed') && e.url === back));
    // A reload of that frame is always intercepted.
    const backFrame = await waitFor(() => page.frames().find((f) => f.url().endsWith('/frames/back.html')));
    await backFrame.evaluate('location.reload()').catch(() => undefined);
    await waitFor(async () => {
      const f = page.frames().find((fr) => fr.url().endsWith('/frames/back.html'));
      return (await f?.evaluate('window.backValue').catch(() => undefined)) === 'patched-back';
    });
  });

  it('reports a changed live file from inside an iframe', async () => {
    await setOverrides([
      makeOverride({ kind: 'Script', sourceUrl: widgetUrl('/frames/widget.js'), content: 'window.x = 1;', originalHash: sha256('something else') }),
    ]);
    await openFrames();
    await waitFor(() => events.some((e) => e.type === 'upstream-changed'));
  });

  it('turning an override off brings back the original inside the iframe', async () => {
    const o = makeOverride({ kind: 'Script', sourceUrl: widgetUrl('/frames/widget.js'), content: "window.widgetValue = 'patched';" });
    await setOverrides([o]);
    await openFrames();
    expect(await evalIn('localhost', 'window.widgetValue')).toBe('patched');
    await setOverrides([{ ...o, enabled: false }]);
    await page.reload();
    await waitFor(async () => (await evalIn('localhost', 'window.widgetValue').catch(() => undefined)) === 'original-widget');
  });
});
