/**
 * Driving Firefox over WebDriver BiDi, the parts that need no browser: the resource type each request is matched as,
 * what rules read from a request, the head an override answers with before its request is sent, the address Firefox
 * writes in its profile, and a tab brought to the front whose window never says it took focus.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import type { FoundBrowser } from '../../src/main/browsers';
import { ACTIVATE_WAIT_MS } from '../../src/main/browsers/driven/firefox/constants';
import { DrivenFirefox } from '../../src/main/browsers/driven/firefox/DrivenFirefox';
import { readBidiPort } from '../../src/main/browsers/driven/firefox/readBidiPort';
import type { DriverDeps } from '../../src/main/browsers/driven/types';
import type { BidiConnection } from '../../src/main/engine/bidi';
import { requestBodyOf } from '../../src/main/engine/bidi/requestBodyOf';
import { requestOf } from '../../src/main/engine/bidi/requestOf';
import { resourceTypeOf } from '../../src/main/engine/bidi/resourceTypeOf';
import { answerContext, decideRequest } from '../../src/main/engine/answering';
import { servedHead } from '../../src/main/engine/answering/servedHead';
import type { BidiAnswerContext, BidiRequestData } from '../../src/main/engine/bidi/types';
import { defaultMatcherFor } from '../../src/shared/matcher';
import { DEFAULT_SETTINGS, type Override, type Rule } from '../../src/shared/types';

const tmp = mkdtempSync(join(tmpdir(), 'console-editor-bidi-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const data = (extra: Partial<BidiRequestData> = {}): BidiRequestData => ({ request: '1', url: 'https://shop.test/app.js', method: 'GET', headers: [], ...extra });
const header = (name: string, value: string) => ({ name, value: { type: 'string' as const, value } });

describe('BiDi requests', () => {
  it('are matched as the resource type the engine knows: by destination, else by initiator type', () => {
    const types = (['document', 'iframe', 'style', 'script', 'image', 'font', 'video', 'worker'] as const).map((destination) => resourceTypeOf(data({ destination })));
    expect(types).toEqual(['Document', 'Document', 'Stylesheet', 'Script', 'Image', 'Font', 'Media', 'Other']);
    expect(resourceTypeOf(data({ destination: '', initiatorType: 'fetch' }))).toBe('Fetch');
    expect(resourceTypeOf(data({ destination: '', initiatorType: 'xmlhttprequest' }))).toBe('XHR');
    expect(resourceTypeOf(data({ destination: '', initiatorType: 'beacon' }))).toBe('Ping');
    expect(resourceTypeOf(data({ destination: '', initiatorType: null }))).toBe('Other');
    expect(resourceTypeOf(data({ destination: 'constructor' }))).toBe('Other');
  });

  it('give rules their address, method and headers by lower-case name', () => {
    expect(requestOf(data({ method: 'PUT', headers: [header('Origin', 'https://app.test'), header('X-Thing', '1')] }))).toEqual({ url: 'https://shop.test/app.js', method: 'PUT', headers: { origin: 'https://app.test', 'x-thing': '1' } });
  });
});

describe('The head an override answers with before its request is sent', () => {
  const now = Date.now();
  const override = (extra: Partial<Override> = {}): Override => ({ id: 'o1', kind: 'Script', sourceUrl: 'https://shop.test/app.js', match: defaultMatcherFor('https://shop.test/app.js'), content: '1', enabled: true, originalHash: null, createdAt: now, updatedAt: now, ...extra });
  const ctx = (rules: Rule[] = [], overrides: Override[] = []) => answerContext({ getOverrides: () => overrides, getRules: () => rules, getSettings: () => DEFAULT_SETTINGS });
  const names = (headers: { name: string; value: string }[]) => Object.fromEntries(headers.map((h) => [h.name.toLowerCase(), h.value]));

  it("has its kind's content type, and isn't kept in the cache", () => {
    const head = servedHead(override(), requestOf(data()), 'Script', ctx());
    expect(head.status).toBe(200);
    expect(names(head.headers)).toMatchObject({ 'content-type': expect.stringMatching(/javascript.*utf-8/i), 'cache-control': 'no-store' });
  });

  it("is readable from another origin, and takes a response override's status and header changes, then the rules", () => {
    const fetchOverride = override({ kind: 'Fetch', response: { status: 201, delayMs: 0, headers: [{ operation: 'set', name: 'x-own', value: 'yes' }], send: false, patch: false } });
    const rule: Rule = { id: 'r1', action: 'headers', match: defaultMatcherFor('https://shop.test/app.js'), resourceTypes: [], enabled: true, createdAt: now, updatedAt: now, headers: [{ operation: 'set', name: 'x-rule', value: 'on' }] };
    const head = servedHead(fetchOverride, requestOf(data({ headers: [header('Origin', 'https://app.test')] })), 'Fetch', ctx([rule]));
    expect(head.status).toBe(201);
    expect(names(head.headers)).toMatchObject({ 'x-own': 'yes', 'x-rule': 'on', 'access-control-allow-origin': 'https://app.test', 'access-control-allow-credentials': 'true' });
  });
});

describe('Deciding what to do with a request before it is sent', () => {
  const now = Date.now();
  const rule = (action: 'block' | 'cors', url: string): Rule => ({ id: `r-${action}`, action, match: defaultMatcherFor(url), resourceTypes: [], enabled: true, createdAt: now, updatedAt: now });
  const script: Override = { id: 'o1', kind: 'Script', sourceUrl: 'https://shop.test/app.js', match: defaultMatcherFor('https://shop.test/app.js'), content: 'patched()', enabled: true, originalHash: null, createdAt: now, updatedAt: now };
  const api: Override = { ...script, id: 'o2', kind: 'Fetch', sourceUrl: 'https://api.test/data', match: defaultMatcherFor('https://api.test/data'), content: '{}', request: { method: 'PUT', operation: '' }, response: { status: 200, delayMs: 250, headers: [], send: false, patch: false } };
  const decide = (url: string, type: string, extra: Partial<BidiRequestData> = {}, rules: Rule[] = []) => decideRequest(answerContext({ getOverrides: () => [script, api], getRules: () => rules, getSettings: () => DEFAULT_SETTINGS }), requestOf(data({ url, ...extra })), type);

  it('fails one a block rule takes, before anything else', () => {
    expect(decide('https://shop.test/app.js', 'Script', {}, [rule('block', 'https://shop.test/app.js')])).toEqual({ action: 'fail' });
  });

  it("answers one an override takes, with its body and delay; a response override's preflight too", () => {
    expect(decide('https://shop.test/app.js', 'Script')).toMatchObject({ action: 'answer', body: 'patched()', delayMs: 0, head: { status: 200 } });
    expect(decide('https://api.test/data', 'Fetch', { method: 'PUT' })).toMatchObject({ action: 'answer', body: '{}', delayMs: 250 });
    const preflight = decide('https://api.test/data', 'Other', { method: 'OPTIONS', headers: [header('Origin', 'https://app.test'), header('Access-Control-Request-Method', 'PUT')] });
    expect(preflight).toMatchObject({ action: 'answer', body: '', head: { status: 204 } });
  });

  it("sends on the rest: another address, a kind the override doesn't answer, another method", () => {
    expect(decide('https://shop.test/other.js', 'Script')).toEqual({ action: 'continue' });
    expect(decide('https://shop.test/app.js', 'Stylesheet')).toEqual({ action: 'continue' });
    expect(decide('https://api.test/data', 'Fetch', { method: 'GET' })).toEqual({ action: 'continue' });
  });

  it('answers a GraphQL operation an override names by the body given, and its preflight whatever the body', () => {
    const graphql: Override = { ...api, id: 'o3', sourceUrl: 'https://api.test/graphql', match: defaultMatcherFor('https://api.test/graphql'), content: '{"data":1}', request: { method: 'POST', operation: 'GetUser' } };
    const ctx = answerContext({ getOverrides: () => [graphql], getRules: () => [], getSettings: () => DEFAULT_SETTINGS });
    const post = (body?: string) => decideRequest(ctx, { ...requestOf(data({ url: 'https://api.test/graphql', method: 'POST' })), body }, 'Fetch');
    expect(post(JSON.stringify({ operationName: 'GetUser', query: 'query GetUser { user { id } }' }))).toMatchObject({ action: 'answer', body: '{"data":1}' });
    expect(post(JSON.stringify({ query: 'query GetUser { user { id } }' }))).toMatchObject({ action: 'answer' });
    expect(post(JSON.stringify({ operationName: 'GetCart' }))).toEqual({ action: 'continue' });
    expect(post()).toEqual({ action: 'continue' });
    const preflight = requestOf(data({ url: 'https://api.test/graphql', method: 'OPTIONS', headers: [header('Origin', 'https://app.test'), header('Access-Control-Request-Method', 'POST')] }));
    expect(decideRequest(ctx, preflight, 'Other')).toMatchObject({ action: 'answer', head: { status: 204 } });
  });
});

describe("A paused request's body", () => {
  const ctx = (collector: string | null, answer: () => Promise<unknown>) => {
    const sent: unknown[] = [];
    const send = (method: string, params: unknown) => {
      sent.push([method, params]);
      return answer();
    };
    return { sent, ctx: { collector, connection: { send } } as unknown as BidiAnswerContext };
  };

  it('is read as text from the collector keeping it, and let go of there', async () => {
    const text = ctx('c1', async () => ({ bytes: { type: 'string', value: '{"query":"{ a }"}' } }));
    expect(await requestBodyOf(text.ctx, data({ request: 'r1', bodySize: 17 }))).toBe('{"query":"{ a }"}');
    expect(text.sent).toEqual([['network.getData', { dataType: 'request', collector: 'c1', request: 'r1', disown: true }]]);
    const binary = ctx('c1', async () => ({ bytes: { type: 'base64', value: Buffer.from('{"x":1}').toString('base64') } }));
    expect(await requestBodyOf(binary.ctx, data({ bodySize: 7 }))).toBe('{"x":1}');
  });

  it("isn't asked for without a collector or a body, and is unknown when the browser didn't keep it", async () => {
    const none = ctx(null, async () => ({}));
    expect(await requestBodyOf(none.ctx, data({ bodySize: 10 }))).toBeUndefined();
    const empty = ctx('c1', async () => ({}));
    expect(await requestBodyOf(empty.ctx, data({ bodySize: 0 }))).toBeUndefined();
    expect([...none.sent, ...empty.sent]).toEqual([]);
    const gone = ctx('c1', () => Promise.reject(new Error('no such network data')));
    expect(await requestBodyOf(gone.ctx, data({ bodySize: 10 }))).toBeUndefined();
  });
});

describe("Firefox's BiDi address", () => {
  it('is read from the file it writes in its profile, once written and whole', async () => {
    expect(await readBidiPort(tmp)).toBeNull();
    writeFileSync(join(tmp, 'WebDriverBiDiServer.json'), '{ "ws_host": "127.0.0.1", "ws_port": 9222 }');
    expect(await readBidiPort(tmp)).toBe('ws://127.0.0.1:9222/session');
    writeFileSync(join(tmp, 'WebDriverBiDiServer.json'), '{ "ws_host": "127.0.0.1"');
    expect(await readBidiPort(tmp)).toBeNull();
  });
});

describe('A Firefox tab brought to the front', () => {
  afterEach(() => vi.useRealTimers());

  /** Firefox with one blank tab, answering every command but `activate`, which it answers as `activate` says. */
  const firefox = (activate: () => Promise<unknown>) => {
    const sent: string[] = [];
    const answers: Record<string, () => Promise<unknown>> = {
      'browsingContext.getTree': async () => ({ contexts: [{ context: 'c1', url: 'about:blank', children: [] }] }),
      'browsingContext.activate': activate,
    };
    const send = (method: string) => {
      sent.push(method);
      return (answers[method] ?? (async () => ({})))();
    };
    const connection = { send, onEvent: () => () => undefined, onClose: () => () => undefined } as unknown as BidiConnection;
    const sources = { store: { list: () => [] }, rules: { list: () => [] }, settings: { get: () => DEFAULT_SETTINGS } } as unknown as DriverDeps['sources'];
    const deps: DriverDeps = { listedAs: { id: 'firefox', name: 'Firefox', everyday: false }, home: tmp, sources, userData: tmp, changed: () => undefined, closed: () => undefined };
    const driver = new DrivenFirefox({ id: 'firefox', name: 'Firefox' } as FoundBrowser, '150.0', connection, deps);
    return { sent, driver };
  };

  it("doesn't hold opening a page for good when its window never says it took focus", async () => {
    const { sent, driver } = firefox(() => new Promise(() => undefined));
    await driver.start();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const opened = driver.open('https://shop.test/');
    await vi.advanceTimersByTimeAsync(ACTIVATE_WAIT_MS);
    await expect(opened).resolves.toMatchObject({ info: { id: 'c1', url: 'https://shop.test/' } });
    expect(sent.slice(-2)).toEqual(['browsingContext.navigate', 'browsingContext.activate']);
  });

  it('still says when Firefox refuses it', async () => {
    const { driver } = firefox(() => Promise.reject(new Error('browsingContext.activate: no such frame')));
    await driver.start();
    await expect(driver.activate('c1')).rejects.toThrow('no such frame');
    await expect(driver.activate('c2')).rejects.toThrow('That tab is closed');
  });
});
