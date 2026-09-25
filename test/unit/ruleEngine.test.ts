import { describe, expect, it } from 'vitest';
import { MatcherCache, pauseStage } from '../../src/main/engine/InterceptionEngine';
import {
  applyCors,
  applyHeaderEdits,
  applyResponseRules,
  findBlockRule,
  findResponseRules,
  isPreflight,
  pausedRequestOf,
  ruleMatches,
  ruleTypeOf,
  sameHead,
  type PausedRequest,
} from '../../src/main/engine/rules';
import type { BlockRule, CorsRule, HeaderEdit, HeaderRule, Rule } from '../../src/shared/types';

const base = { resourceTypes: [], enabled: true, createdAt: 1, updatedAt: 1 };
const exact = (pattern: string) => ({ type: 'exact' as const, pattern, ignoreQuery: true });
const block = (partial: Partial<BlockRule> = {}): BlockRule => ({ ...base, id: 'b1', action: 'block', match: exact('https://a.com/x.js'), ...partial });
const headers = (edits: HeaderEdit[], partial: Partial<HeaderRule> = {}): HeaderRule => ({
  ...base,
  id: 'h1',
  action: 'headers',
  match: exact('https://a.com/x.js'),
  headers: edits,
  ...partial,
});
const cors = (partial: Partial<CorsRule> = {}): CorsRule => ({ ...base, id: 'c1', action: 'cors', match: exact('https://a.com/x.js'), ...partial });
const set = (name: string, value: string): HeaderEdit => ({ operation: 'set', name, value });
const remove = (name: string): HeaderEdit => ({ operation: 'remove', name, value: '' });
const get: PausedRequest = { url: 'https://api.b.com/data', method: 'GET', headers: {} };

describe('applyHeaderEdits', () => {
  it('sets a header in place of every spelling of it, written as given', () => {
    const list = [
      { name: 'x-mode', value: 'a' },
      { name: 'Keep', value: '1' },
      { name: 'X-MODE', value: 'b' },
    ];
    expect(applyHeaderEdits(list, [set('X-Mode', 'c')])).toEqual([
      { name: 'Keep', value: '1' },
      { name: 'X-Mode', value: 'c' },
    ]);
  });

  it('leaves the list as it is when it already holds just that header', () => {
    const list = [
      { name: 'cache-control', value: 'no-store' },
      { name: 'Keep', value: '1' },
    ];
    expect(applyHeaderEdits(list, [set('Cache-Control', 'no-store')])).toBe(list);
  });

  it('removes every entry of a name, and applies edits in order', () => {
    const list = [
      { name: 'Set-Me', value: '1' },
      { name: 'set-me', value: '2' },
    ];
    expect(applyHeaderEdits(list, [remove('SET-ME')])).toEqual([]);
    expect(applyHeaderEdits([], [set('A', '1'), set('B', '2'), remove('a'), set('a', '3')])).toEqual([
      { name: 'B', value: '2' },
      { name: 'a', value: '3' },
    ]);
  });

  it('skips operations it does not know and protected headers, and never mutates its input', () => {
    const list = [{ name: 'Content-Length', value: '10' }];
    const frozen = Object.freeze(list.map((h) => Object.freeze({ ...h })));
    const unknown = { operation: 'append', name: 'X', value: '1' } as unknown as HeaderEdit;
    expect(applyHeaderEdits(frozen as never, [unknown, remove('content-length'), set('Set-Cookie', 'a=1'), set('X-Ok', '1')])).toEqual([
      { name: 'Content-Length', value: '10' },
      { name: 'X-Ok', value: '1' },
    ]);
    expect(frozen).toEqual(list);
  });
});

describe('applyResponseRules', () => {
  it('counts only the rules that changed the head, and a newer set wins', () => {
    const head = { status: 200, headers: [{ name: 'X-Mode', value: 'old' }] };
    const unchanged = headers([set('X-Mode', 'old')], { id: 'same' });
    const older = headers([set('X-Mode', 'one')], { id: 'older' });
    const newer = headers([set('x-mode', 'two')], { id: 'newer' });
    const ruled = applyResponseRules(head, [unchanged, older, newer], get);
    expect(ruled).toEqual({ head: { status: 200, headers: [{ name: 'x-mode', value: 'two' }] }, applied: ['older', 'newer'] });
    expect(head.headers).toEqual([{ name: 'X-Mode', value: 'old' }]);
  });
});

describe('sameHead', () => {
  it('compares the status and every header in order, as spelled', () => {
    const a = { status: 200, headers: [{ name: 'A', value: '1' }, { name: 'B', value: '2' }] };
    expect(sameHead(a, { status: 200, headers: [...a.headers] })).toBe(true);
    expect(sameHead(a, { status: 204, headers: a.headers })).toBe(false);
    expect(sameHead(a, { status: 200, headers: [a.headers[1], a.headers[0]] })).toBe(false);
    expect(sameHead(a, { status: 200, headers: [{ name: 'a', value: '1' }, a.headers[1]] })).toBe(false);
    expect(sameHead(a, { status: 200, headers: a.headers.slice(1) })).toBe(false);
  });
});

describe('applyCors', () => {
  const upstream = [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'access-control-allow-origin', value: 'https://other.com' },
    { name: 'X-Api', value: 'b' },
    { name: 'x-api', value: 'c' },
    { name: 'Cache-Control', value: 'no-store' },
    { name: 'Set-Cookie', value: 'a=1' },
    { name: 'ETag', value: '"1"' },
  ];

  it("echoes the request's Origin with credentials, replaces upstream's CORS headers and exposes the rest", () => {
    const head = applyCors({ status: 200, headers: upstream }, { ...get, headers: { origin: 'https://a.com' } });
    expect(head).toEqual({
      status: 200,
      headers: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'X-Api', value: 'b' },
        { name: 'x-api', value: 'c' },
        { name: 'Cache-Control', value: 'no-store' },
        { name: 'Set-Cookie', value: 'a=1' },
        { name: 'ETag', value: '"1"' },
        { name: 'Access-Control-Allow-Origin', value: 'https://a.com' },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
        { name: 'Access-Control-Expose-Headers', value: 'x-api, etag' },
      ],
    });
  });

  it("falls back to the frame's origin, then to any origin without credentials", () => {
    const fromFrame = applyCors({ status: 200, headers: [] }, { ...get, frameUrl: 'http://127.0.0.1:5174/page?q=1' });
    expect(fromFrame.headers).toEqual([
      { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:5174' },
      { name: 'Access-Control-Allow-Credentials', value: 'true' },
    ]);
    const unknown = applyCors({ status: 200, headers: [] }, { ...get, frameUrl: 'about:blank' });
    expect(unknown.headers).toEqual([{ name: 'Access-Control-Allow-Origin', value: '*' }]);
  });

  it('turns a refused preflight into a 204 that allows what it asked for, uncached', () => {
    const preflight: PausedRequest = {
      url: 'https://api.b.com/data',
      method: 'OPTIONS',
      headers: { origin: 'https://a.com', 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type,x-custom' },
    };
    expect(applyCors({ status: 405, headers: [{ name: 'Allow', value: 'GET' }] }, preflight)).toEqual({
      status: 204,
      headers: [
        { name: 'Allow', value: 'GET' },
        { name: 'Access-Control-Allow-Origin', value: 'https://a.com' },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
        { name: 'Access-Control-Allow-Methods', value: 'PUT' },
        { name: 'Access-Control-Allow-Headers', value: 'content-type,x-custom' },
        { name: 'Access-Control-Max-Age', value: '0' },
      ],
    });
    const { 'access-control-request-headers': _asked, ...noHeaders } = preflight.headers;
    const ok = applyCors({ status: 200, headers: [] }, { ...preflight, headers: noHeaders });
    expect(ok.status).toBe(200);
    expect(ok.headers.map((h) => h.name)).not.toContain('Access-Control-Allow-Headers');
  });
});

describe('rule matching', () => {
  const matchers = new MatcherCache();

  it('names CDP resource types as the type filter does', () => {
    expect(ruleTypeOf('Fetch')).toBe('XHR');
    expect(ruleTypeOf('EventSource')).toBe('XHR');
    expect(ruleTypeOf('TextTrack')).toBe('Media');
    expect(ruleTypeOf('Ping')).toBe('Ping');
    expect(ruleTypeOf('Script')).toBe('Script');
    expect(ruleTypeOf('Prefetch')).toBe('Other');
    expect(ruleTypeOf('constructor')).toBe('Other');
  });

  it('checks on/off, the action, documents, the type filter and the URL', () => {
    const url = 'https://a.com/x.js?v=2';
    expect(ruleMatches(block(), url, 'Script', matchers)).toBe(true);
    expect(ruleMatches(block({ enabled: false }), url, 'Script', matchers)).toBe(false);
    expect(ruleMatches({ ...block(), action: 'redirect' } as unknown as Rule, url, 'Script', matchers)).toBe(false);
    expect(ruleMatches(block({ resourceTypes: ['Stylesheet'] }), url, 'Script', matchers)).toBe(false);
    expect(ruleMatches(block({ resourceTypes: ['XHR'] }), url, 'Fetch', matchers)).toBe(true);
    expect(ruleMatches(block(), 'https://a.com/y.js', 'Script', matchers)).toBe(false);
    expect(ruleMatches(block(), url, 'Document', matchers)).toBe(true);
    expect(ruleMatches(cors(), url, 'Document', matchers)).toBe(false);
    expect(ruleMatches(cors(), url, 'XHR', matchers)).toBe(true);
  });

  it('finds the oldest block rule, and the response rules in order', () => {
    const rules: Rule[] = [headers([set('A', '1')], { id: 'h-old' }), block({ id: 'b-old' }), cors({ id: 'c' }), block({ id: 'b-new' }), headers([set('A', '2')], { id: 'h-new' })];
    expect(findBlockRule(rules, 'https://a.com/x.js', 'Script', matchers)?.id).toBe('b-old');
    expect(findBlockRule(rules, 'https://a.com/other.js', 'Script', matchers)).toBeUndefined();
    expect(findResponseRules(rules, 'https://a.com/x.js', 'Script', matchers).map((r) => r.id)).toEqual(['h-old', 'c', 'h-new']);
  });

  it('compiles each matcher once, keyed by the matcher itself', () => {
    const cache = new MatcherCache();
    const one = cache.predicate(exact('https://a.com/'));
    expect(cache.predicate({ ...exact('https://a.com/') })).toBe(one);
    const noQuery = cache.predicate({ ...exact('https://a.com/'), ignoreQuery: false });
    expect(noQuery).not.toBe(one);
    expect(one('https://a.com/?q')).toBe(true);
    expect(noQuery('https://a.com/?q')).toBe(false);
    expect(cache.predicate({ type: 'glob', pattern: 'https://a.com/', ignoreQuery: true })).not.toBe(one);
    cache.clear();
    expect(cache.predicate(exact('https://a.com/'))).not.toBe(one);
  });
});

describe('paused requests', () => {
  it('reads the request headers by lower-case name, and the frame URL', () => {
    const p = { requestId: 'r', resourceType: 'XHR', request: { url: 'https://b.com/', method: 'OPTIONS', headers: { Origin: 'https://a.com', 'Access-Control-Request-Method': 'PUT' } } };
    const request = pausedRequestOf(p, 'https://a.com/page');
    expect(request).toEqual({
      url: 'https://b.com/',
      method: 'OPTIONS',
      headers: { origin: 'https://a.com', 'access-control-request-method': 'PUT' },
      frameUrl: 'https://a.com/page',
    });
    expect(isPreflight(request)).toBe(true);
    expect(pausedRequestOf({ ...p, request: { url: 'https://b.com/', method: 'GET' } }, undefined)).toEqual({ url: 'https://b.com/', method: 'GET', headers: {} });
  });

  it('tells a preflight from any other OPTIONS request', () => {
    expect(isPreflight({ ...get, method: 'OPTIONS' })).toBe(false);
    expect(isPreflight({ ...get, headers: { 'access-control-request-method': 'PUT' } })).toBe(false);
  });

  it('tells the stage from the status and error reason', () => {
    expect(pauseStage({})).toBe('Request');
    expect(pauseStage({ responseStatusCode: 200 })).toBe('Response');
    expect(pauseStage({ responseErrorReason: 'Failed' })).toBe('Response');
    expect(pauseStage({ responseStatusCode: 0, responseErrorReason: 'Failed' })).toBe('Response');
  });
});
