/**
 * Driving Firefox over WebDriver BiDi, the parts that need no browser: the resource type each request is matched as,
 * what rules read from a request, the head an override answers with before its request is sent, and the address
 * Firefox writes in its profile.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readBidiPort } from '../../src/main/browsers/driven/firefox/readBidiPort';
import { requestOf } from '../../src/main/engine/bidi/requestOf';
import { resourceTypeOf } from '../../src/main/engine/bidi/resourceTypeOf';
import { answerContext, decideRequest } from '../../src/main/engine/answering';
import { servedHead } from '../../src/main/engine/answering/servedHead';
import type { BidiRequestData } from '../../src/main/engine/bidi/types';
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
