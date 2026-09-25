import { describe, expect, it, vi } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { computeFetchPatterns, InterceptionEngine, sha256, type EngineOptions } from '../../src/main/engine/InterceptionEngine';
import { DEFAULT_SETTINGS, type BlockRule, type CorsRule, type EngineEvent, type HeaderRule, type Override, type Rule } from '../../src/shared/types';

function override(partial: Partial<Override>): Override {
  return {
    id: 'o1',
    kind: 'Script',
    sourceUrl: 'https://a.com/app.js',
    match: { type: 'exact', pattern: 'https://a.com/app.js', ignoreQuery: true },
    enabled: true,
    originalHash: null,
    createdAt: 0,
    updatedAt: 0,
    content: 'patched();',
    ...partial,
  };
}

class FakeTransport implements CdpTransport {
  calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
  handlers = new Map<string, Set<(p: unknown) => void>>();
  responses: Record<string, unknown> = {
    'Page.getFrameTree': { frameTree: { frame: { id: 'main' } } },
    'Page.addScriptToEvaluateOnNewDocument': { identifier: 'guard-1' },
  };
  failing = new Set<string>();

  async send<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    this.calls.push({ method, params });
    if (this.failing.has(method)) throw new Error(`${method} failed`);
    return (this.responses[method] ?? {}) as T;
  }

  on(event: string, handler: (p: unknown) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, params: unknown): void {
    for (const h of this.handlers.get(event) ?? []) h(params);
  }

  methods(): string[] {
    return this.calls.map((c) => c.method);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

async function setup(overrides: Override[] = [], settings = { ...DEFAULT_SETTINGS }, rules: Rule[] = [], extra: Partial<EngineOptions> = {}) {
  const transport = new FakeTransport();
  const events: EngineEvent[] = [];
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getRules: () => rules,
    getSettings: () => settings,
    emit: (e) => events.push(e),
    ...extra,
  });
  await engine.attach();
  return { transport, engine, events, overrides, settings, rules };
}

const matchExact = (pattern: string) => ({ type: 'exact' as const, pattern, ignoreQuery: true });

function blockRule(partial: Partial<BlockRule> = {}): BlockRule {
  return { id: 'b1', action: 'block', match: matchExact('https://a.com/ads.js'), resourceTypes: [], enabled: true, createdAt: 1, updatedAt: 1, ...partial };
}

function headerRule(partial: Partial<HeaderRule> = {}): HeaderRule {
  return {
    id: 'h1',
    action: 'headers',
    match: matchExact('https://a.com/api'),
    resourceTypes: [],
    headers: [{ operation: 'set', name: 'X-Added', value: 'yes' }],
    enabled: true,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

function corsRule(partial: Partial<CorsRule> = {}): CorsRule {
  return { id: 'c1', action: 'cors', match: matchExact('https://api.b.com/data'), resourceTypes: [], enabled: true, createdAt: 1, updatedAt: 1, ...partial };
}

describe('computeFetchPatterns', () => {
  it('is empty without enabled overrides', () => {
    expect(computeFetchPatterns([override({ enabled: false })], [], DEFAULT_SETTINGS)).toEqual([]);
  });

  it('adds a document pattern for SRI stripping when a script is overridden', () => {
    expect(computeFetchPatterns([override({})], [], DEFAULT_SETTINGS)).toEqual([
      { urlPattern: 'https://a.com/app.js*', resourceType: undefined, requestStage: 'Response' },
      { urlPattern: '*', resourceType: 'Document', requestStage: 'Response' },
    ]);
  });

  it('restricts regex overrides to their resource type', () => {
    const patterns = computeFetchPatterns(
      [override({ match: { type: 'regex', pattern: 'x', ignoreQuery: false } })],
      [],
      { ...DEFAULT_SETTINGS, stripIntegrity: false },
    );
    expect(patterns).toEqual([{ urlPattern: '*', resourceType: 'Script', requestStage: 'Response' }]);
  });

  it('keeps working with an override of a match type it does not know', () => {
    const unknown = { type: 'prefix', pattern: 'x', ignoreQuery: false } as unknown as Override['match'];
    const patterns = computeFetchPatterns([override({ match: unknown })], [], { ...DEFAULT_SETTINGS, stripIntegrity: false });
    expect(patterns).toEqual([{ urlPattern: '*', resourceType: 'Script', requestStage: 'Response' }]);
  });

  const noSri = { ...DEFAULT_SETTINGS, stripIntegrity: false };

  it('pauses block rules at the Request stage, with no resource type', () => {
    const patterns = computeFetchPatterns([], [blockRule({ resourceTypes: ['Script'] })], DEFAULT_SETTINGS);
    expect(patterns).toEqual([{ urlPattern: 'https://a.com/ads.js*', requestStage: 'Request' }]);
    expect(patterns[0]).not.toHaveProperty('resourceType');
  });

  it('pauses header and CORS rules at the Response stage', () => {
    expect(computeFetchPatterns([], [headerRule({ resourceTypes: ['XHR'] }), corsRule()], noSri)).toEqual([
      { urlPattern: 'https://a.com/api*', requestStage: 'Response' },
      { urlPattern: 'https://api.b.com/data*', requestStage: 'Response' },
    ]);
  });

  it('keeps both stages for a block rule and an override of one URL', () => {
    const patterns = computeFetchPatterns([override({})], [blockRule({ match: matchExact('https://a.com/app.js') })], noSri);
    expect(patterns).toEqual([
      { urlPattern: 'https://a.com/app.js*', resourceType: undefined, requestStage: 'Response' },
      { urlPattern: 'https://a.com/app.js*', requestStage: 'Request' },
    ]);
  });

  it('pauses every request at its stage for a regex rule, whatever its types', () => {
    const regex = blockRule({ match: { type: 'regex', pattern: 'ads', ignoreQuery: false }, resourceTypes: ['Image'] });
    expect(computeFetchPatterns([], [regex], noSri)).toEqual([{ urlPattern: '*', requestStage: 'Request' }]);
  });

  it('ignores disabled rules and actions it does not know', () => {
    const unknown = { ...blockRule(), action: 'redirect' } as unknown as Rule;
    expect(computeFetchPatterns([], [blockRule({ enabled: false }), unknown], DEFAULT_SETTINGS)).toEqual([]);
  });

  it('adds no SRI pattern for rules alone', () => {
    const patterns = computeFetchPatterns([], [headerRule(), blockRule()], DEFAULT_SETTINGS);
    expect(patterns.some((p) => p.resourceType === 'Document')).toBe(false);
  });
});

describe('InterceptionEngine', () => {
  it('applies settings and enables Fetch only when needed', async () => {
    const { transport, engine, overrides } = await setup();
    expect(transport.methods()).toEqual([
      'Page.enable',
      'Page.getFrameTree',
      'Network.enable',
      'Network.setCacheDisabled',
      'Network.setBypassServiceWorker',
      'Page.setBypassCSP',
      'Page.addScriptToEvaluateOnNewDocument',
    ]);
    overrides.push(override({}));
    await engine.refreshInterception();
    expect(transport.methods().at(-1)).toBe('Fetch.enable');
    overrides.length = 0;
    await engine.refreshInterception();
    expect(transport.methods().at(-1)).toBe('Fetch.disable');
  });

  it('installs the SRI guard only while SRI stripping is on', async () => {
    const { transport, engine, settings } = await setup();
    settings.stripIntegrity = false;
    await engine.applySettings();
    expect(transport.calls.find((c) => c.method === 'Page.removeScriptToEvaluateOnNewDocument')?.params).toEqual({ identifier: 'guard-1' });
    settings.stripIntegrity = true;
    await engine.applySettings();
    await engine.applySettings();
    expect(transport.methods().filter((m) => m === 'Page.addScriptToEvaluateOnNewDocument')).toHaveLength(2);
  });

  it('prefers exact over glob over regex, then the newest', async () => {
    const { engine } = await setup([
      override({ id: 'regex', match: { type: 'regex', pattern: 'app', ignoreQuery: false }, updatedAt: 9 }),
      override({ id: 'glob-old', match: { type: 'glob', pattern: 'https://a.com/*.js', ignoreQuery: true }, updatedAt: 1 }),
      override({ id: 'glob-new', match: { type: 'glob', pattern: 'https://a.com/a*', ignoreQuery: true }, updatedAt: 2 }),
    ]);
    expect(engine.findOverride('https://a.com/app.js')?.id).toBe('glob-new');
  });

  it('fulfills matching requests with the override body and upstream headers', async () => {
    const { transport, events } = await setup([override({})]);
    transport.emit('Fetch.requestPaused', {
      requestId: 'f1',
      networkId: 'n1',
      resourceType: 'Script',
      request: { url: 'https://a.com/app.js?v=2', method: 'GET' },
      responseStatusCode: 200,
      responseHeaders: [
        { name: 'content-type', value: 'application/javascript' },
        { name: 'content-encoding', value: 'gzip' },
      ],
    });
    await flush();
    const fulfill = transport.calls.find((c) => c.method === 'Fetch.fulfillRequest');
    expect(fulfill?.params?.responseCode).toBe(200);
    expect(Buffer.from(String(fulfill?.params?.body), 'base64').toString()).toBe('patched();');
    expect(fulfill?.params?.responseHeaders).toContainEqual({ name: 'Content-Type', value: 'application/javascript; charset=utf-8' });
    expect(events).toContainEqual({ type: 'override-served', overrideId: 'o1', url: 'https://a.com/app.js?v=2' });

    transport.emit('Network.responseReceived', {
      requestId: 'n1',
      type: 'Script',
      frameId: 'main',
      response: { url: 'https://a.com/app.js?v=2', status: 200, mimeType: 'application/javascript' },
    });
    expect(events.at(-1)).toEqual({
      type: 'resource',
      resource: { url: 'https://a.com/app.js?v=2', kind: 'Script', mimeType: 'application/javascript', status: 200, overrideId: 'o1' },
    });
  });

  it('matches overrides by kind: HTML overrides answer documents only, script/style overrides never do', async () => {
    const regexScript = override({ id: 'script', match: { type: 'regex', pattern: 'a\\.com', ignoreQuery: false } });
    const html = override({ id: 'html', kind: 'Document', match: { type: 'exact', pattern: 'https://a.com/page', ignoreQuery: true } });
    const { engine } = await setup([regexScript, html]);
    expect(engine.findOverride('https://a.com/', 'Document')).toBeUndefined();
    expect(engine.findOverride('https://a.com/page', 'Document')?.id).toBe('html');
    expect(engine.findOverride('https://a.com/page', 'Script')?.id).toBe('script');
    // A script fetched with XHR/fetch still gets its override.
    expect(engine.findOverride('https://a.com/app.js', 'Fetch')?.id).toBe('script');
    // A stylesheet is never answered with a script (a glob like main.* matches both).
    expect(engine.findOverride('https://a.com/main.css', 'Stylesheet')).toBeUndefined();
  });

  it('lets a stylesheet whose URL a script glob matches through unmodified', async () => {
    const glob = override({ match: { type: 'glob', pattern: 'https://a.com/static/main.*', ignoreQuery: true } });
    const { transport, events } = await setup([glob]);
    transport.emit('Fetch.requestPaused', { requestId: 'f1', resourceType: 'Stylesheet', request: { url: 'https://a.com/static/main.css', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
    await flush();
    expect(transport.methods()).toContain('Fetch.continueRequest');
    expect(transport.methods()).not.toContain('Fetch.fulfillRequest');
    expect(events.some((e) => e.type === 'override-served')).toBe(false);
  });

  describe('override-missed', () => {
    const response = (t: FakeTransport, requestId: string, url = 'https://a.com/app.js', type = 'Script') =>
      t.emit('Network.responseReceived', { requestId, type, frameId: 'main', response: { url, status: 200, mimeType: 'text/javascript' } });
    const missed = (events: EngineEvent[]) => events.filter((e) => e.type === 'override-missed');

    it('reports an enabled override whose file arrived unmodified, once per URL until the next navigation', async () => {
      const { transport, events } = await setup([override({})]);
      response(transport, 'r1');
      response(transport, 'r2');
      expect(missed(events)).toEqual([{ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js' }]);
      transport.emit('Page.frameNavigated', { frame: { id: 'main', loaderId: 'next', url: 'https://a.com/' } });
      response(transport, 'r3');
      expect(missed(events)).toHaveLength(2);
    });

    it('stays quiet for served files, disabled overrides and other kinds', async () => {
      const regexScript = override({ id: 'rx', match: { type: 'regex', pattern: '/static/main\\.', ignoreQuery: false } });
      const { transport, events, overrides } = await setup([override({}), regexScript]);
      transport.emit('Fetch.requestPaused', { requestId: 'f1', networkId: 'r1', resourceType: 'Script', request: { url: 'https://a.com/app.js', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
      await flush();
      response(transport, 'r1');
      // The regex override only pauses scripts, so a stylesheet it also matches was never its to serve.
      response(transport, 'css', 'https://a.com/static/main.css', 'Stylesheet');
      overrides[0]!.enabled = false;
      response(transport, 'r2');
      expect(missed(events)).toEqual([]);
    });
  });

  it("reports the raw upstream hash for a document whose SRI attributes it stripped", async () => {
    const raw = '<script src="/a.js" integrity="sha384-x"></script>';
    const { transport, engine } = await setup([override({})]);
    transport.responses['Fetch.getResponseBody'] = { body: raw, base64Encoded: false };
    transport.emit('Fetch.requestPaused', {
      requestId: 'f1',
      networkId: 'doc',
      resourceType: 'Document',
      request: { url: 'https://a.com/', method: 'GET' },
      responseStatusCode: 200,
      responseHeaders: [{ name: 'content-type', value: 'text/html' }],
    });
    await flush();
    const fulfill = transport.calls.find((c) => c.method === 'Fetch.fulfillRequest');
    expect(Buffer.from(String(fulfill?.params?.body), 'base64').toString()).toBe('<script src="/a.js"></script>');
    transport.emit('Network.responseReceived', { requestId: 'doc', type: 'Document', frameId: 'main', response: { url: 'https://a.com/', status: 200, mimeType: 'text/html' } });
    // Chromium only kept the stripped HTML…
    transport.responses['Network.getResponseBody'] = { body: '<script src="/a.js"></script>', base64Encoded: false };
    const content = await engine.getResourceContent('https://a.com/');
    // …but the hash is the upstream one, so a Document override made from it won't warn of phantom redeploys.
    expect(content.hash).toBe(sha256(raw));
  });

  it("drops the upstream hash when the same document later arrives without being rewritten", async () => {
    const raw = '<script src="/a.js" integrity="sha384-x"></script>';
    const { transport, engine } = await setup([override({})]);
    transport.responses['Fetch.getResponseBody'] = { body: raw, base64Encoded: false };
    transport.emit('Fetch.requestPaused', { requestId: 'f1', networkId: 'doc1', resourceType: 'Document', request: { url: 'https://a.com/', method: 'GET' }, responseStatusCode: 200, responseHeaders: [{ name: 'content-type', value: 'text/html' }] });
    await flush();
    transport.emit('Network.responseReceived', { requestId: 'doc1', type: 'Document', frameId: 'main', response: { url: 'https://a.com/', status: 200, mimeType: 'text/html' } });
    // Redeployed without integrity attributes: nothing to rewrite this time.
    const plain = '<script src="/a.js"></script><p>v2</p>';
    transport.responses['Fetch.getResponseBody'] = { body: plain, base64Encoded: false };
    transport.emit('Fetch.requestPaused', { requestId: 'f2', networkId: 'doc2', resourceType: 'Document', request: { url: 'https://a.com/', method: 'GET' }, responseStatusCode: 200, responseHeaders: [{ name: 'content-type', value: 'text/html' }] });
    await flush();
    transport.emit('Network.responseReceived', { requestId: 'doc2', type: 'Document', frameId: 'main', response: { url: 'https://a.com/', status: 200, mimeType: 'text/html' } });
    transport.responses['Network.getResponseBody'] = { body: plain, base64Encoded: false };
    expect((await engine.getResourceContent('https://a.com/')).hash).toBe(sha256(plain));
  });

  it('does not override redirects', async () => {
    const { transport } = await setup([override({})]);
    transport.emit('Fetch.requestPaused', {
      requestId: 'f1',
      resourceType: 'Script',
      request: { url: 'https://a.com/app.js', method: 'GET' },
      responseStatusCode: 302,
      responseHeaders: [{ name: 'Location', value: '/login' }],
    });
    await flush();
    expect(transport.methods()).toContain('Fetch.continueRequest');
    expect(transport.methods()).not.toContain('Fetch.fulfillRequest');
  });

  it('continues the request and reports an error if fulfilling fails', async () => {
    const { transport, events } = await setup([override({})]);
    transport.failing.add('Fetch.fulfillRequest');
    transport.emit('Fetch.requestPaused', {
      requestId: 'f1',
      resourceType: 'Script',
      request: { url: 'https://a.com/app.js', method: 'GET' },
      responseStatusCode: 200,
      responseHeaders: [],
    });
    await flush();
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(events.some((e) => e.type === 'error')).toBe(true);
  });

  it('stays quiet when a request fails only because its frame or session went away', async () => {
    const { transport, events } = await setup([override({})]);
    const fail = (message: string) => {
      transport.send = async <T,>(method: string, params?: Record<string, unknown>): Promise<T> => {
        transport.calls.push({ method, params });
        if (method === 'Fetch.fulfillRequest') throw new Error(message);
        return {} as T;
      };
    };
    for (const message of ['Session with given id not found.', 'Invalid InterceptionId.', 'iframe session S1 is gone']) {
      fail(message);
      transport.emit('Fetch.requestPaused', { requestId: 'f', resourceType: 'Script', request: { url: 'https://a.com/app.js', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
      await flush();
      expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    }
    expect(events.some((e) => e.type === 'error')).toBe(false);
  });

  describe('navigations', () => {
    const request = (t: FakeTransport, loaderId: string, frameId: string, url: string) =>
      t.emit('Network.requestWillBeSent', { requestId: loaderId, loaderId, frameId, type: 'Document', documentURL: url, request: { url } });
    const response = (t: FakeTransport, url: string, loaderId = 'old', type = 'Script', requestId = url) =>
      t.emit('Network.responseReceived', { requestId, loaderId, frameId: 'main', type, response: { url, status: 200, mimeType: 'text/javascript' } });
    const commit = (t: FakeTransport, loaderId: string, url: string) =>
      t.emit('Page.frameNavigated', { frame: { id: 'main', loaderId, url } });

    it('resets the list when the main frame commits, not when it starts navigating', async () => {
      const { transport, engine, events } = await setup();
      response(transport, 'https://a.com/1.js');
      request(transport, 'iframe', 'child', 'https://b.com/');
      request(transport, 'nav', 'main', 'https://a.com/next');
      // Not committed yet: the old page is still there.
      expect(engine.listResources().map((r) => r.url)).toEqual(['https://a.com/1.js']);
      expect(events.some((e) => e.type === 'navigated')).toBe(false);

      commit(transport, 'nav', 'https://a.com/next');
      expect(engine.listResources()).toEqual([]);
      expect(events).toContainEqual({ type: 'navigated', url: 'https://a.com/next' });
    });

    it("lists the new document at commit, and not the old page's late responses", async () => {
      const { transport, engine, events } = await setup();
      request(transport, 'nav', 'main', 'https://a.com/');
      response(transport, 'https://a.com/', 'nav', 'Document', 'nav');
      response(transport, 'https://a.com/late.js', 'old');
      expect(events.some((e) => e.type === 'resource')).toBe(false);

      commit(transport, 'nav', 'https://a.com/');
      expect(engine.listResources().map((r) => r.url)).toEqual(['https://a.com/']);
      const order = events.map((e) => e.type);
      expect(order.indexOf('navigated')).toBeLessThan(order.indexOf('resource'));
      response(transport, 'https://a.com/new.js', 'nav');
      expect(engine.listResources().map((r) => r.url)).toEqual(['https://a.com/', 'https://a.com/new.js']);
    });

    it('keeps the old list when a navigation never commits (download, 204)', async () => {
      const { transport, engine, events } = await setup();
      response(transport, 'https://a.com/1.js');
      request(transport, 'dl', 'main', 'https://a.com/file.zip');
      transport.emit('Page.frameStoppedLoading', { frameId: 'main' });
      expect(engine.listResources().map((r) => r.url)).toEqual(['https://a.com/1.js']);
      expect(events.some((e) => e.type === 'navigated')).toBe(false);
      // Later responses of the old page are listed again.
      response(transport, 'https://a.com/2.js');
      expect(engine.listResources()).toHaveLength(2);
    });

    it('resets on a commit without a request (back/forward cache) and drops a superseded document', async () => {
      const { transport, engine, events } = await setup();
      response(transport, 'https://a.com/1.js');
      commit(transport, 'bfcache', 'https://a.com/back');
      expect(engine.listResources()).toEqual([]);
      expect(events).toContainEqual({ type: 'navigated', url: 'https://a.com/back' });

      request(transport, 'nav', 'main', 'https://a.com/next');
      response(transport, 'https://a.com/next', 'nav', 'Document', 'nav');
      commit(transport, 'other', 'https://a.com/other');
      expect(engine.listResources()).toEqual([]);
    });

    it('tags navigations of an iframe session with its id', async () => {
      const transport = new FakeTransport();
      transport.responses['Page.getFrameTree'] = { frameTree: { frame: { id: 'F', parentId: 'P' } } };
      const events: EngineEvent[] = [];
      const engine = new InterceptionEngine({
        transport,
        getOverrides: () => [],
        getRules: () => [],
        getSettings: () => DEFAULT_SETTINGS,
        emit: (e) => events.push(e),
        iframe: { id: 'S1', depth: 1 },
      });
      await engine.attach();
      transport.emit('Page.frameNavigated', { frame: { id: 'F', parentId: 'P', loaderId: 'x', url: 'https://b.com/2' } });
      expect(events).toContainEqual({ type: 'navigated', url: 'https://b.com/2', iframeId: 'S1' });
    });
  });

  it('ignores data: and non-overridable resources', async () => {
    const { transport, engine } = await setup();
    transport.emit('Network.responseReceived', { requestId: '1', type: 'Script', response: { url: 'data:text/javascript,1', status: 200, mimeType: '' } });
    transport.emit('Network.responseReceived', { requestId: '2', type: 'Image', response: { url: 'https://a.com/x.png', status: 200, mimeType: '' } });
    expect(engine.listResources()).toEqual([]);
  });
});

type Paused = {
  requestId?: string;
  networkId?: string;
  resourceType?: string;
  frameId?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  responseStatusCode?: number;
  responseStatusText?: string;
  responseErrorReason?: string;
  responseHeaders?: Array<{ name: string; value: string }>;
};

/** Emits a Fetch.requestPaused (a Request-stage pause unless it has a status or an error reason). */
function pause(t: FakeTransport, { url, method = 'GET', headers, requestId = 'f1', networkId = 'n1', resourceType = 'Script', frameId = 'main', ...rest }: Paused) {
  t.emit('Fetch.requestPaused', { requestId, networkId, resourceType, frameId, request: { url, method, ...(headers ? { headers } : {}) }, ...rest });
}

const call = (t: FakeTransport, method: string) => t.calls.find((c) => c.method === method);
const count = (t: FakeTransport, method: string) => t.methods().filter((m) => m === method).length;
const applied = (events: EngineEvent[]) => events.filter((e) => e.type === 'rule-applied');

describe('InterceptionEngine: Request stage (block rules)', () => {
  it('fails a matching request as blocked by the client, lists it and counts a hit', async () => {
    const { transport, events, engine } = await setup([], undefined, [blockRule()]);
    pause(transport, { url: 'https://a.com/ads.js?v=1' });
    await flush();
    expect(call(transport, 'Fetch.failRequest')?.params).toEqual({ requestId: 'f1', errorReason: 'BlockedByClient' });
    expect(transport.methods()).not.toContain('Fetch.continueRequest');
    expect(applied(events)).toEqual([{ type: 'rule-applied', ruleId: 'b1', url: 'https://a.com/ads.js?v=1' }]);
    const resource = { url: 'https://a.com/ads.js?v=1', kind: 'Script', mimeType: '', status: 0, blockedBy: 'b1' };
    expect(events).toContainEqual({ type: 'resource', resource });
    expect(engine.listResources()).toEqual([resource]);
  });

  it('continues requests no enabled rule blocks', async () => {
    const { transport, events } = await setup([], undefined, [blockRule({ enabled: false })]);
    pause(transport, { url: 'https://a.com/ads.js' });
    await flush();
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(transport.methods()).not.toContain('Fetch.failRequest');
    expect(events).toEqual([]);
  });

  it('never consults overrides before the response exists', async () => {
    const { transport, events } = await setup([override({})]);
    pause(transport, { url: 'https://a.com/app.js' });
    await flush();
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(transport.methods()).not.toContain('Fetch.fulfillRequest');
    expect(transport.methods()).not.toContain('Fetch.getResponseBody');
    expect(events).toEqual([]);
  });

  it('blocks a URL that is also overridden: a block beats everything', async () => {
    const { transport, events } = await setup([override({})], undefined, [blockRule({ match: matchExact('https://a.com/app.js') })]);
    pause(transport, { url: 'https://a.com/app.js' });
    await flush();
    expect(transport.methods()).toContain('Fetch.failRequest');
    expect(transport.methods()).not.toContain('Fetch.fulfillRequest');
    expect(events.some((e) => e.type === 'override-served')).toBe(false);
  });

  it("never blocks the page's own document, but blocks an iframe's", async () => {
    const page = blockRule({ match: { type: 'glob', pattern: 'https://a.com/*', ignoreQuery: true } });
    const { transport, events } = await setup([], undefined, [page]);
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', frameId: 'main', requestId: 'top' });
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', frameId: undefined, requestId: 'no-frame' });
    await flush();
    expect(transport.calls.filter((c) => c.method === 'Fetch.continueRequest').map((c) => c.params?.requestId)).toEqual(['top', 'no-frame']);
    expect(transport.methods()).not.toContain('Fetch.failRequest');

    pause(transport, { url: 'https://a.com/frame.html', resourceType: 'Document', frameId: 'child', requestId: 'frame' });
    await flush();
    expect(call(transport, 'Fetch.failRequest')?.params).toEqual({ requestId: 'frame', errorReason: 'BlockedByClient' });
    expect(events).toContainEqual({
      type: 'resource',
      resource: { url: 'https://a.com/frame.html', kind: 'Document', mimeType: '', status: 0, blockedBy: 'b1', frame: { url: 'https://a.com/frame.html', depth: 1 } },
    });
  });

  it('applies the type filter in the handler: fetch() pauses as XHR, and some builds say Fetch', async () => {
    const scripts = blockRule({ id: 'scripts', match: matchExact('https://a.com/api'), resourceTypes: ['Script'] });
    const xhr = blockRule({ id: 'xhr', match: matchExact('https://a.com/data'), resourceTypes: ['XHR'] });
    const { transport } = await setup([], undefined, [scripts, xhr]);
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', requestId: 'api' });
    pause(transport, { url: 'https://a.com/data', resourceType: 'Fetch', requestId: 'data' });
    await flush();
    expect(call(transport, 'Fetch.continueRequest')?.params).toEqual({ requestId: 'api' });
    expect(call(transport, 'Fetch.failRequest')?.params).toEqual({ requestId: 'data', errorReason: 'BlockedByClient' });
  });

  it('blocks a CORS preflight by the same URL rule, and lists no XHR', async () => {
    const { transport, events } = await setup([], undefined, [blockRule({ match: matchExact('https://api.b.com/data') })]);
    pause(transport, {
      url: 'https://api.b.com/data',
      method: 'OPTIONS',
      resourceType: 'XHR',
      headers: { Origin: 'https://a.com', 'Access-Control-Request-Method': 'PUT' },
    });
    await flush();
    expect(transport.methods()).toContain('Fetch.failRequest');
    expect(applied(events)).toHaveLength(1);
    expect(events.some((e) => e.type === 'resource')).toBe(false);
  });

  it('does not list a file blocked while the page is navigating (it is the old page’s)', async () => {
    const { transport, events, engine } = await setup([], undefined, [blockRule()]);
    transport.emit('Network.requestWillBeSent', { requestId: 'nav', loaderId: 'nav', frameId: 'main', type: 'Document', documentURL: 'https://a.com/next', request: { url: 'https://a.com/next' } });
    pause(transport, { url: 'https://a.com/ads.js' });
    await flush();
    expect(transport.methods()).toContain('Fetch.failRequest');
    expect(applied(events)).toHaveLength(1);
    expect(events.some((e) => e.type === 'resource')).toBe(false);
    expect(engine.listResources()).toEqual([]);
  });

  it('opens a blocked file through the out-of-page fetch, not the page', async () => {
    const fallbackFetch = vi.fn(async () => 'live();');
    const { transport, engine } = await setup([], undefined, [blockRule()], { fallbackFetch });
    pause(transport, { url: 'https://a.com/ads.js' });
    await flush();
    const content = await engine.getResourceContent('https://a.com/ads.js');
    expect(content).toEqual({ url: 'https://a.com/ads.js', content: 'live();', hash: sha256('live();') });
    expect(fallbackFetch).toHaveBeenCalledWith('https://a.com/ads.js');
    expect(transport.methods()).not.toContain('Network.getResponseBody');
    expect(transport.methods()).not.toContain('Page.getResourceContent');
  });

  it('stays quiet when the request went away before it could be failed', async () => {
    const { transport, events } = await setup([], undefined, [blockRule()]);
    const send = transport.send.bind(transport);
    transport.send = async <T,>(method: string, params?: Record<string, unknown>): Promise<T> => {
      if (method === 'Fetch.failRequest') {
        transport.calls.push({ method, params });
        throw new Error('Invalid InterceptionId.');
      }
      return send<T>(method, params);
    };
    pause(transport, { url: 'https://a.com/ads.js' });
    await flush();
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(events).toEqual([]);
  });
});

describe('InterceptionEngine: Response stage (header and CORS rules)', () => {
  const noSri = () => ({ ...DEFAULT_SETTINGS, stripIntegrity: false });
  const json = [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Cache-Control', value: 'max-age=600' },
  ];

  it('passes a response on with the edited headers: code and phrase with the whole list, body untouched', async () => {
    const { transport, events } = await setup([], undefined, [headerRule()]);
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, responseStatusText: 'OK', responseHeaders: json });
    await flush();
    expect(call(transport, 'Fetch.continueResponse')?.params).toEqual({
      requestId: 'f1',
      responseCode: 200,
      responsePhrase: 'OK',
      responseHeaders: [...json, { name: 'X-Added', value: 'yes' }],
    });
    expect(transport.methods()).not.toContain('Fetch.getResponseBody');
    expect(transport.methods()).not.toContain('Fetch.continueRequest');
    expect(applied(events)).toEqual([{ type: 'rule-applied', ruleId: 'h1', url: 'https://a.com/api' }]);
  });

  it('sends no phrase when upstream gave none', async () => {
    const { transport } = await setup([], undefined, [headerRule()]);
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, responseHeaders: json });
    await flush();
    expect(call(transport, 'Fetch.continueResponse')?.params).not.toHaveProperty('responsePhrase');
  });

  it('continues untouched, with no hit, when the rule changes nothing', async () => {
    const remove = headerRule({ headers: [{ operation: 'remove', name: 'X-Missing', value: '' }] });
    const { transport, events } = await setup([], undefined, [remove]);
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, responseHeaders: json });
    await flush();
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(transport.methods()).not.toContain('Fetch.continueResponse');
    expect(events).toEqual([]);
  });

  it('continues a pause with no whole response head (a network error, Electron’s extra preflight pause, no headers)', async () => {
    const { transport, events } = await setup([], undefined, [headerRule(), corsRule()]);
    pause(transport, { url: 'https://api.b.com/data', method: 'OPTIONS', resourceType: 'XHR', responseErrorReason: 'Failed', requestId: 'failed' });
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, requestId: 'headless' });
    await flush();
    expect(transport.calls.filter((c) => c.method === 'Fetch.continueRequest').map((c) => c.params?.requestId)).toEqual(['failed', 'headless']);
    expect(transport.methods()).not.toContain('Fetch.continueResponse');
    expect(events).toEqual([]);
  });

  it('edits a redirect’s headers and keeps its Location', async () => {
    const { transport } = await setup([], undefined, [headerRule()]);
    const location = { name: 'Location', value: '/login' };
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 302, responseHeaders: [location] });
    await flush();
    expect(call(transport, 'Fetch.continueResponse')?.params).toMatchObject({ responseCode: 302, responseHeaders: [location, { name: 'X-Added', value: 'yes' }] });
  });

  const gzipPage = [
    { name: 'Content-Type', value: 'text/html; charset=utf-8' },
    { name: 'Content-Encoding', value: 'gzip' },
    { name: 'Content-Length', value: '75' },
    { name: 'ETag', value: '"v1"' },
    { name: 'Content-Security-Policy', value: "script-src 'self'" },
  ];
  const html = '<!doctype html><script>window.inline = true</script>';
  const html64 = Buffer.from(html).toString('base64');
  const removeCsp = headerRule({ match: matchExact('https://a.com/'), headers: [{ operation: 'remove', name: 'Content-Security-Policy', value: '' }] });

  it('re-serves an HTML document whose headers a rule changes: one body read, one fulfil', async () => {
    const { transport, events } = await setup([], undefined, [removeCsp]);
    transport.responses['Fetch.getResponseBody'] = { body: html64, base64Encoded: true };
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', responseStatusCode: 200, responseStatusText: 'OK', responseHeaders: gzipPage });
    await flush();
    expect(count(transport, 'Fetch.getResponseBody')).toBe(1);
    expect(count(transport, 'Fetch.fulfillRequest')).toBe(1);
    expect(call(transport, 'Fetch.fulfillRequest')?.params).toEqual({
      requestId: 'f1',
      responseCode: 200,
      responsePhrase: 'OK',
      responseHeaders: [
        { name: 'Content-Type', value: 'text/html; charset=utf-8' },
        { name: 'ETag', value: '"v1"' },
      ],
      body: html64,
    });
    expect(applied(events)).toEqual([{ type: 'rule-applied', ruleId: 'h1', url: 'https://a.com/' }]);
  });

  it('never reads a document whose rules change nothing (SRI stripping only reads while a file is overridden)', async () => {
    const keep = headerRule({ match: matchExact('https://a.com/'), headers: [{ operation: 'remove', name: 'X-Frame-Options', value: '' }] });
    const { transport, events } = await setup([], undefined, [keep]);
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', responseStatusCode: 200, responseHeaders: gzipPage });
    await flush();
    expect(transport.methods()).not.toContain('Fetch.getResponseBody');
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(events).toEqual([]);
  });

  it('passes a document that is not HTML (a PDF, a download) on with continueResponse, never buffering it', async () => {
    const { transport } = await setup([], undefined, [headerRule({ match: matchExact('https://a.com/doc.pdf') })]);
    pause(transport, { url: 'https://a.com/doc.pdf', resourceType: 'Document', responseStatusCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/pdf' }] });
    await flush();
    expect(transport.methods()).not.toContain('Fetch.getResponseBody');
    expect(call(transport, 'Fetch.continueResponse')?.params).toMatchObject({ responseCode: 200 });
  });

  it('reports a document it could not re-serve, and passes the headers on as best it can', async () => {
    const { transport, events } = await setup([], undefined, [removeCsp]);
    transport.failing.add('Fetch.getResponseBody');
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', responseStatusCode: 200, responseHeaders: gzipPage });
    await flush();
    expect(events.find((e) => e.type === 'error')).toEqual({ type: 'error', message: expect.stringMatching(/Could not re-serve https:\/\/a\.com\//) });
    expect(transport.methods().at(-1)).toBe('Fetch.continueResponse');
    expect(transport.methods()).not.toContain('Fetch.fulfillRequest');
  });

  it('strips SRI and applies the rules in one fulfil', async () => {
    const { transport, events } = await setup([override({})], undefined, [removeCsp]);
    transport.responses['Fetch.getResponseBody'] = { body: '<script src="/a.js" integrity="sha384-x"></script>', base64Encoded: false };
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', responseStatusCode: 200, responseHeaders: gzipPage });
    await flush();
    expect(count(transport, 'Fetch.getResponseBody')).toBe(1);
    expect(count(transport, 'Fetch.fulfillRequest')).toBe(1);
    const fulfil = call(transport, 'Fetch.fulfillRequest')?.params;
    expect(Buffer.from(String(fulfil?.body), 'base64').toString()).toBe('<script src="/a.js"></script>');
    expect(fulfil?.responseHeaders).toEqual([{ name: 'Content-Type', value: 'text/html; charset=utf-8' }]);
    expect(applied(events)).toHaveLength(1);
  });

  it('with SRI on and nothing to strip, reads the body once and passes it back for the rules', async () => {
    const { transport } = await setup([override({})], undefined, [removeCsp]);
    transport.responses['Fetch.getResponseBody'] = { body: html64, base64Encoded: true };
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', responseStatusCode: 200, responseHeaders: gzipPage });
    await flush();
    expect(count(transport, 'Fetch.getResponseBody')).toBe(1);
    expect(call(transport, 'Fetch.fulfillRequest')?.params?.body).toBe(html64);
  });

  it('applies rules last on an override: a rule beats the forced no-store, and a rule’s Content-Type stays UTF-8', async () => {
    const rule = headerRule({
      match: matchExact('https://a.com/app.js'),
      headers: [
        { operation: 'set', name: 'Cache-Control', value: 'max-age=60' },
        { operation: 'set', name: 'Content-Type', value: 'text/javascript' },
      ],
    });
    const { transport, events } = await setup([override({})], undefined, [rule]);
    pause(transport, { url: 'https://a.com/app.js', responseStatusCode: 200, responseHeaders: [{ name: 'X-Upstream', value: '1' }] });
    await flush();
    expect(call(transport, 'Fetch.fulfillRequest')?.params?.responseHeaders).toEqual([
      { name: 'X-Upstream', value: '1' },
      { name: 'Cache-Control', value: 'max-age=60' },
      { name: 'Content-Type', value: 'text/javascript; charset=utf-8' },
    ]);
    expect(events).toEqual([
      { type: 'override-served', overrideId: 'o1', url: 'https://a.com/app.js' },
      { type: 'rule-applied', ruleId: 'h1', url: 'https://a.com/app.js' },
    ]);
  });

  it('lets an override answering a missing API be read cross-origin through a CORS rule', async () => {
    const api = override({ match: matchExact('https://api.b.com/data') });
    const { transport } = await setup([api], undefined, [corsRule()]);
    pause(transport, { url: 'https://api.b.com/data', resourceType: 'XHR', headers: { Origin: 'https://a.com' }, responseStatusCode: 404, responseHeaders: [] });
    await flush();
    const fulfil = call(transport, 'Fetch.fulfillRequest')?.params;
    expect(fulfil?.responseCode).toBe(200);
    expect(fulfil?.responseHeaders).toContainEqual({ name: 'Access-Control-Allow-Origin', value: 'https://a.com' });
    expect(fulfil?.responseHeaders).toContainEqual({ name: 'Access-Control-Allow-Credentials', value: 'true' });
  });

  it('never answers a CORS preflight from an override', async () => {
    const api = override({ match: matchExact('https://api.b.com/data') });
    const { transport, events } = await setup([api]);
    pause(transport, {
      url: 'https://api.b.com/data',
      method: 'OPTIONS',
      resourceType: 'XHR',
      headers: { Origin: 'https://a.com', 'Access-Control-Request-Method': 'PUT' },
      responseStatusCode: 405,
      responseHeaders: [],
    });
    await flush();
    expect(transport.methods()).not.toContain('Fetch.fulfillRequest');
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(events).toEqual([]);
  });

  it('turns a refused preflight into a success through a CORS rule', async () => {
    const { transport } = await setup([], undefined, [corsRule()]);
    pause(transport, {
      url: 'https://api.b.com/data',
      method: 'OPTIONS',
      resourceType: 'XHR',
      headers: { Origin: 'https://a.com', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
      responseStatusCode: 405,
      responseStatusText: 'Method Not Allowed',
      responseHeaders: [{ name: 'Allow', value: 'GET' }],
    });
    await flush();
    expect(call(transport, 'Fetch.continueResponse')?.params).toEqual({
      requestId: 'f1',
      responseCode: 204,
      responseHeaders: [
        { name: 'Allow', value: 'GET' },
        { name: 'Access-Control-Allow-Origin', value: 'https://a.com' },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
        { name: 'Access-Control-Allow-Methods', value: 'PUT' },
        { name: 'Access-Control-Allow-Headers', value: 'content-type' },
        { name: 'Access-Control-Max-Age', value: '0' },
      ],
    });
  });

  it('applies rules oldest first, so a newer rule’s set wins, and counts both', async () => {
    const older = headerRule({ id: 'old', createdAt: 1, headers: [{ operation: 'set', name: 'X-Mode', value: 'old' }] });
    const newer = headerRule({ id: 'new', createdAt: 2, headers: [{ operation: 'set', name: 'x-mode', value: 'new' }] });
    const { transport, events } = await setup([], undefined, [older, newer]);
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, responseHeaders: [] });
    await flush();
    expect(call(transport, 'Fetch.continueResponse')?.params?.responseHeaders).toEqual([{ name: 'x-mode', value: 'new' }]);
    expect(applied(events).map((e) => e.ruleId)).toEqual(['old', 'new']);
  });

  it('reads rules at pause time: header edits need no pattern refresh', async () => {
    const { transport, rules } = await setup([], undefined, [headerRule()]);
    (rules[0] as HeaderRule).headers = [{ operation: 'set', name: 'X-Edited', value: 'later' }];
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, responseHeaders: [] });
    await flush();
    expect(call(transport, 'Fetch.continueResponse')?.params?.responseHeaders).toEqual([{ name: 'X-Edited', value: 'later' }]);
  });

  it('never applies a CORS rule to a document', async () => {
    const { transport, events } = await setup([], noSri(), [corsRule({ match: matchExact('https://a.com/') })]);
    pause(transport, { url: 'https://a.com/', resourceType: 'Document', responseStatusCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }] });
    await flush();
    expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
    expect(transport.methods()).not.toContain('Fetch.getResponseBody');
    expect(events).toEqual([]);
  });
});

describe('InterceptionEngine: rule-missed', () => {
  const response = (t: FakeTransport, requestId: string, url: string, type = 'Script', frameId = 'main') =>
    t.emit('Network.responseReceived', { requestId, type, frameId, response: { url, status: 200, mimeType: 'text/javascript' } });
  const missed = (events: EngineEvent[]) => events.filter((e) => e.type === 'rule-missed');

  it('reports a listed file an enabled block rule matches that arrived anyway, once per URL until the next navigation', async () => {
    const { transport, events } = await setup([], undefined, [blockRule()]);
    response(transport, 'r1', 'https://a.com/ads.js');
    response(transport, 'r2', 'https://a.com/ads.js');
    expect(missed(events)).toEqual([{ type: 'rule-missed', ruleId: 'b1', url: 'https://a.com/ads.js' }]);
    transport.emit('Page.frameNavigated', { frame: { id: 'main', loaderId: 'next', url: 'https://a.com/' } });
    response(transport, 'r3', 'https://a.com/ads.js');
    expect(missed(events)).toHaveLength(2);
  });

  it("never reports the page's own document, which is never blocked", async () => {
    const all = blockRule({ match: { type: 'glob', pattern: 'https://a.com/*', ignoreQuery: true } });
    const { transport, events } = await setup([], undefined, [all]);
    response(transport, 'doc', 'https://a.com/', 'Document');
    expect(missed(events)).toEqual([]);
    response(transport, 'frame', 'https://a.com/frame.html', 'Document', 'child');
    expect(missed(events)).toHaveLength(1);
  });
});

describe('InterceptionEngine: failing open', () => {
  it('continues the request before it reports the error', async () => {
    let methodsAtError: string[] | undefined;
    const transport = new FakeTransport();
    const engine = new InterceptionEngine({
      transport,
      getOverrides: () => [],
      getRules: () => [headerRule()],
      getSettings: () => DEFAULT_SETTINGS,
      emit: (e) => {
        if (e.type === 'error') methodsAtError = transport.methods();
      },
    });
    await engine.attach();
    transport.failing.add('Fetch.continueResponse');
    pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, responseHeaders: [] });
    await flush();
    expect(methodsAtError?.at(-1)).toBe('Fetch.continueRequest');
  });

  it('still continues the request when reporting throws (the window is gone), and nothing rejects', async () => {
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    try {
      const transport = new FakeTransport();
      const engine = new InterceptionEngine({
        transport,
        getOverrides: () => [],
        getRules: () => [headerRule()],
        getSettings: () => DEFAULT_SETTINGS,
        emit: () => {
          throw new Error('window destroyed');
        },
      });
      await engine.attach();
      transport.failing.add('Fetch.continueResponse');
      pause(transport, { url: 'https://a.com/api', resourceType: 'XHR', responseStatusCode: 200, responseHeaders: [] });
      await flush();
      await flush();
      expect(transport.methods().at(-1)).toBe('Fetch.continueRequest');
      expect(rejections).toEqual([]);
    } finally {
      process.off('unhandledRejection', onRejection);
    }
  });
});
