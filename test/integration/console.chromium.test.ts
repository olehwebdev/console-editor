/**
 * The console against real Chromium, on the fixture's services page: a shell on
 * 127.0.0.1 with a same-site nav iframe, and cart and billing iframes on sites
 * of their own (separate processes and CDP sessions). Each frame logs as it
 * starts; the shell relays cart's messages to billing, which logs them.
 */
import type { Page } from 'playwright-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConsoleService } from '../../src/main/console';
import { PageInterception } from '../../src/main/engine/PageInterception';
import { DEFAULT_SETTINGS, type AppEvent, type ConsoleEntry, type ConsoleFrame } from '../../src/shared/types';
import { startFixtureSite, type FixtureSite } from '../fixtures/site';
import { chromiumAvailable, launchChromium, type ChromiumHarness } from '../helpers/chromium';

async function waitFor<T>(fn: () => T | undefined | Promise<T | undefined>, timeout = 10_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

const text = (entry: ConsoleEntry) => entry.values.map((v) => v.text).join(' ');

describe.skipIf(!chromiumAvailable)('console in Chromium', () => {
  let site: FixtureSite;
  let chrome: ChromiumHarness;
  let page: Page;
  let interception: PageInterception;
  let service: ConsoleService;
  let detachTransport: () => Promise<void>;
  let events: AppEvent[];

  const port = () => new URL(site.url).port;
  /** The frame whose document is at `url`. */
  const frameAt = (url: string) => waitFor(() => service.listFrames().find((f) => f.url === url));
  /** The first row that says `words`. */
  const logged = (words: string) => waitFor(() => service.listEntries().find((e) => text(e).includes(words)));

  beforeAll(async () => {
    site = await startFixtureSite();
    chrome = await launchChromium();
  });

  afterAll(async () => {
    await chrome?.close();
    await site?.close();
  });

  beforeEach(async () => {
    events = [];
    const opened = await chrome.newPage();
    page = opened.page;
    detachTransport = () => opened.transport.detach();
    service = new ConsoleService({ getSettings: () => DEFAULT_SETTINGS, send: (e) => events.push(e) });
    interception = new PageInterception({
      transport: opened.transport,
      getOverrides: () => [],
      getSettings: () => DEFAULT_SETTINGS,
      emit: () => undefined,
      sessions: service,
    });
    await interception.attach();
    await page.goto(`${site.url}/services.html`);
  });

  afterEach(async () => {
    interception.detach();
    await detachTransport();
    await page.close();
  });

  it('lists the page and each iframe, in and out of process, under its parent', async () => {
    const cart = await frameAt(`http://cart.localhost:${port()}/services/cart.html`);
    const billing = await frameAt(`http://billing.localhost:${port()}/services/billing.html`);
    const nav = await frameAt(`${site.url}/services/nav.html`);
    const top = service.listFrames().find((f) => !f.parentId) as ConsoleFrame;
    expect(top.url).toBe(`${site.url}/services.html`);
    expect([nav, cart, billing].map((f) => [f.name, f.parentId])).toEqual([
      ['nav', top.id],
      ['cart', top.id],
      ['billing', top.id],
    ]);
    // Cart and billing really are separate targets, so this isn't passing on one session.
    expect(interception.targets()).toHaveLength(2);
    await waitFor(() => service.listFrames().every((f) => f.canRun));
  });

  it("catches every frame's first log line, each on its own frame", async () => {
    const byFrame = new Map(service.listFrames().map((f) => [f.id, f]));
    for (const [words, url] of [
      ['shell ready', `${site.url}/services.html`],
      ['nav ready', `${site.url}/services/nav.html`],
      ['cart ready', `http://cart.localhost:${port()}/services/cart.html`],
      ['billing ready', `http://billing.localhost:${port()}/services/billing.html`],
    ]) {
      const entry = await logged(words!);
      const frame = byFrame.get(entry.frameId!) ?? (await frameAt(url!));
      expect(frame.url, words).toBe(url);
      expect(entry).toMatchObject({ level: 'info', source: 'console', location: { url } });
    }
  });

  it("runs code in the frame you pick, and shows another frame's logs reacting", async () => {
    const cart = await frameAt(`http://cart.localhost:${port()}/services/cart.html`);
    const billing = await frameAt(`http://billing.localhost:${port()}/services/billing.html`);
    await waitFor(() => service.listFrames().find((f) => f.id === cart.id)?.canRun);

    const origin = await service.evaluate(cart.id, 'location.origin');
    expect(origin.values).toEqual([{ kind: 'string', text: `http://cart.localhost:${port()}` }]);

    await service.evaluate(cart.id, 'addItem(42)');
    const reaction = await logged('billing got');
    expect(reaction.frameId).toBe(billing.id);
    expect(text(reaction)).toBe('billing got {"type":"add","sku":42}');
    // Ran code comes first, the reaction after it.
    const input = service.listEntries().find((e) => e.source === 'input' && text(e) === 'addItem(42)')!;
    expect(input.id).toBeLessThan(reaction.id);
  });

  it('awaits at the top level and expands what comes back', async () => {
    const cart = await frameAt(`http://cart.localhost:${port()}/services/cart.html`);
    await waitFor(() => service.listFrames().find((f) => f.id === cart.id)?.canRun);
    const result = await service.evaluate(cart.id, 'await Promise.resolve({ sku: 42, lines: [1, 2] })');
    expect(result.values[0]).toMatchObject({ kind: 'object', text: '{sku: 42, lines: Array(2)}' });
    const props = await service.properties(result.values[0]!.handle);
    expect(props.filter((p) => !p.name.startsWith('[['))).toEqual([
      { name: 'sku', value: { kind: 'number', text: '42' } },
      { name: 'lines', value: { kind: 'object', text: '[1, 2]', handle: expect.any(Number) } },
    ]);
  });

  it('records uncaught errors and rejections on the frame they came from', async () => {
    const billing = await frameAt(`http://billing.localhost:${port()}/services/billing.html`);
    await waitFor(() => service.listFrames().find((f) => f.id === billing.id)?.canRun);
    await service.evaluate(billing.id, "setTimeout(() => { throw new Error('card declined') }); Promise.reject(new Error('no retry')); 0");
    const uncaught = (words: string) => waitFor(() => service.listEntries().find((e) => e.source === 'exception' && text(e).includes(words)));
    const thrown = await uncaught('card declined');
    const rejected = await uncaught('no retry');
    for (const entry of [thrown, rejected]) expect(entry).toMatchObject({ frameId: billing.id, level: 'error', source: 'exception' });
    expect(text(rejected)).toMatch(/^Uncaught \(in promise\)/);
  });

  it('keeps a frame when it loads another page, with a divider in the stream', async () => {
    const cart = await frameAt(`http://cart.localhost:${port()}/services/cart.html`);
    const next = `http://cart.localhost:${port()}/services/nav.html`;
    await page.frames().find((f) => f.url().startsWith('http://cart.localhost'))!.goto(next);
    const moved = await frameAt(next);
    expect(moved.id).toBe(cart.id);
    const divider = await waitFor(() => service.listEntries().find((e) => e.source === 'navigation' && text(e) === next));
    expect(divider.frameId).toBe(cart.id);
    await logged('nav ready');
  });

  it('sends frames and rows to the renderer in batches, frames first', async () => {
    await logged('billing ready');
    await waitFor(() => events.some((e) => e.type === 'console-entries'));
    const firstRows = events.findIndex((e) => e.type === 'console-entries');
    expect(events.findIndex((e) => e.type === 'frames-changed')).toBeLessThan(firstRows);
    // A handful of batches for four frames starting, not one message per row.
    expect(events.length).toBeLessThan(service.listEntries().length + 10);
  });
});
