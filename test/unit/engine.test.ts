import { describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { computeFetchPatterns, InterceptionEngine, sha256, type EngineOptions } from '../../src/main/engine/InterceptionEngine';
import { DEFAULT_SETTINGS, type EngineEvent, type Override, type WorkerType } from '../../src/shared/types';

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
  /** Methods that never answer (like Network commands to a stopped service worker). */
  hanging = new Set<string>();

  async send<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    this.calls.push({ method, params });
    if (this.hanging.has(method)) return new Promise<T>(() => undefined);
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

async function setup(overrides: Override[] = [], settings = { ...DEFAULT_SETTINGS }, options: Partial<EngineOptions> = {}) {
  const transport = new FakeTransport();
  const events: EngineEvent[] = [];
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getSettings: () => settings,
    emit: (e) => events.push(e),
    ...options,
  });
  await engine.attach();
  return { transport, engine, events, overrides, settings };
}

/** A worker's first script (its target id is that request's id). */
const W = 'https://a.com/w.js';
const exact = (pattern: string) => ({ type: 'exact' as const, pattern, ignoreQuery: true });

/** An engine on the session of a worker whose first script is `W`, not attached yet. */
function worker(type: WorkerType, overrides: Override[] = [], options: Partial<EngineOptions> = {}, nested = false) {
  const transport = new FakeTransport();
  const events: EngineEvent[] = [];
  const settings = { ...DEFAULT_SETTINGS };
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getSettings: () => settings,
    emit: (e) => events.push(e),
    worker: { id: 'W1', type, targetId: 'T-W1', url: W, nested },
    ...options,
  });
  return { transport, engine, events, overrides, settings };
}

describe('computeFetchPatterns', () => {
  it('is empty without enabled overrides', () => {
    expect(computeFetchPatterns([override({ enabled: false })], DEFAULT_SETTINGS)).toEqual([]);
  });

  it('adds a document pattern for SRI stripping when a script is overridden', () => {
    expect(computeFetchPatterns([override({})], DEFAULT_SETTINGS)).toEqual([
      { urlPattern: 'https://a.com/app.js*', resourceType: undefined, requestStage: 'Response' },
      { urlPattern: '*', resourceType: 'Document', requestStage: 'Response' },
    ]);
  });

  it('restricts regex overrides to their resource type; script ones also pause Other (worker scripts)', () => {
    const patterns = computeFetchPatterns(
      [override({ match: { type: 'regex', pattern: 'x', ignoreQuery: false } })],
      { ...DEFAULT_SETTINGS, stripIntegrity: false },
    );
    expect(patterns).toEqual([
      { urlPattern: '*', resourceType: 'Script', requestStage: 'Response' },
      { urlPattern: '*', resourceType: 'Other', requestStage: 'Response' },
    ]);
  });

  it('pauses Other for regex script overrides only, once', () => {
    const regex = { type: 'regex', pattern: 'x', ignoreQuery: false } as const;
    const patterns = computeFetchPatterns(
      [override({ id: 'a', match: regex }), override({ id: 'b', match: regex }), override({ id: 'css', kind: 'Stylesheet', match: regex })],
      { ...DEFAULT_SETTINGS, stripIntegrity: false },
    );
    expect(patterns.map((p) => p.resourceType)).toEqual(['Script', 'Other', 'Stylesheet']);
    // Exact and glob overrides pause every type already.
    expect(computeFetchPatterns([override({})], { ...DEFAULT_SETTINGS, stripIntegrity: false })).toEqual([
      { urlPattern: 'https://a.com/app.js*', requestStage: 'Response' },
    ]);
  });

  it('keeps working with an override of a match type it does not know', () => {
    const unknown = { type: 'prefix', pattern: 'x', ignoreQuery: false } as unknown as Override['match'];
    const patterns = computeFetchPatterns([override({ match: unknown })], { ...DEFAULT_SETTINGS, stripIntegrity: false });
    // Paused as for a regex: a script override also pauses Other (worker scripts).
    expect(patterns).toEqual([
      { urlPattern: '*', resourceType: 'Script', requestStage: 'Response' },
      { urlPattern: '*', resourceType: 'Other', requestStage: 'Response' },
    ]);
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

  it("doesn't count a file as served when fulfilling it failed", async () => {
    const { transport, engine, events } = await setup([override({})]);
    transport.failing.add('Fetch.fulfillRequest');
    transport.emit('Fetch.requestPaused', { requestId: 'j1', networkId: 'n1', resourceType: 'Script', request: { url: 'https://a.com/app.js', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
    await flush();
    transport.emit('Network.responseReceived', { requestId: 'n1', type: 'Script', response: { url: 'https://a.com/app.js', status: 200, mimeType: 'text/javascript' } });
    expect(engine.listResources()[0]?.overrideId).toBeUndefined();
    expect(events).toContainEqual({ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js' });
  });

  it('answers `Other` requests (what workers load as scripts) with script overrides only', async () => {
    const css = override({ id: 'css', kind: 'Stylesheet', match: { type: 'glob', pattern: 'https://a.com/static/main.*', ignoreQuery: true }, updatedAt: 2 });
    const js = override({ id: 'js', match: { type: 'glob', pattern: 'https://a.com/static/main.*', ignoreQuery: true }, updatedAt: 1 });
    const { engine } = await setup([css, js]);
    expect(engine.findOverride('https://a.com/static/main.worker.js', 'Other')?.id).toBe('js');
    // fetch()/XHR keep their rule: script and style overrides both answer.
    expect(engine.findOverride('https://a.com/static/main.css', 'XHR')?.id).toBe('css');
  });

  it("doesn't report a file a service worker answered as missed (it was served, or not, on the worker's session)", async () => {
    const { transport, events } = await setup([override({})]);
    transport.emit('Network.responseReceived', { requestId: 'r1', type: 'Script', response: { url: 'https://a.com/app.js', status: 200, mimeType: 'text/javascript', fromServiceWorker: true } });
    transport.emit('Network.responseReceived', { requestId: 'r2', type: 'Script', response: { url: 'https://a.com/app.js?v=2', status: 200, mimeType: 'text/javascript' } });
    expect(events.filter((e) => e.type === 'override-missed')).toEqual([{ type: 'override-missed', overrideId: 'o1', url: 'https://a.com/app.js?v=2' }]);
  });

  it("reads a file a service worker answered out of the page (the page may have got an override served on the worker's session)", async () => {
    const { transport, engine } = await setup([], undefined, { fallbackFetch: async (url) => `live ${url}` });
    transport.responses['Network.getResponseBody'] = { body: 'patched();', base64Encoded: false };
    transport.emit('Network.responseReceived', { requestId: 'r1', type: 'Script', frameId: 'main', response: { url: 'https://a.com/app.js', status: 200, mimeType: 'text/javascript', fromServiceWorker: true } });
    expect((await engine.getResourceContent('https://a.com/app.js')).content).toBe('live https://a.com/app.js');
    expect(transport.methods()).not.toContain('Network.getResponseBody');
    expect(transport.methods()).not.toContain('Page.getResourceContent');
    // One the network answered is read from the page.
    transport.emit('Network.responseReceived', { requestId: 'r2', type: 'Script', frameId: 'main', response: { url: 'https://a.com/b.js', status: 200, mimeType: 'text/javascript' } });
    expect((await engine.getResourceContent('https://a.com/b.js')).content).toBe('patched();');
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
        getSettings: () => DEFAULT_SETTINGS,
        emit: (e) => events.push(e),
        iframe: { id: 'S1', depth: 1 },
      });
      await engine.attach();
      transport.emit('Page.frameNavigated', { frame: { id: 'F', parentId: 'P', loaderId: 'x', url: 'https://b.com/2' } });
      expect(events).toContainEqual({ type: 'navigated', url: 'https://b.com/2', iframeId: 'S1' });
    });

    it("forgets what the page's sessions served only when the page itself navigates", async () => {
      // Shared by every session of the page: a worker's files are served on one and reported on another.
      const servedBy = new Map([['n1', 'o1']]);
      const transport = new FakeTransport();
      transport.responses['Page.getFrameTree'] = { frameTree: { frame: { id: 'F', parentId: 'P' } } };
      const frame = new InterceptionEngine({
        transport,
        getOverrides: () => [],
        getSettings: () => DEFAULT_SETTINGS,
        emit: () => undefined,
        iframe: { id: 'S1', depth: 1 },
        servedBy,
      });
      await frame.attach();
      transport.emit('Page.frameNavigated', { frame: { id: 'F', parentId: 'P', loaderId: 'x', url: 'https://b.com/' } });
      expect(servedBy.size).toBe(1);
      const page = await setup([], undefined, { servedBy });
      commit(page.transport, 'nav', 'https://a.com/');
      expect(servedBy.size).toBe(0);
    });
  });

  describe('worker sessions', () => {
    const LIB = 'https://a.com/lib.js';
    const response = (t: FakeTransport, requestId: string, url: string, type = 'Script', mimeType = 'text/javascript') =>
      t.emit('Network.responseReceived', { requestId, type, response: { url, status: 200, mimeType } });
    const paused = (t: FakeTransport, networkId: string, url: string, resourceType: string) =>
      t.emit('Fetch.requestPaused', { requestId: `job-${networkId}`, networkId, resourceType, request: { url, method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
    /** The worker's first script requested on its own session (sent again for each redirect). */
    const requested = (t: FakeTransport, url = W) => t.emit('Network.requestWillBeSent', { requestId: 'T-W1', request: { url } });
    const finished = (t: FakeTransport) => t.emit('Network.loadingFinished', { requestId: 'T-W1' });
    const missed = (events: EngineEvent[]) => events.filter((e) => e.type === 'override-missed');
    /** Pauses answered with `method` (`Fetch.fulfillRequest`, `Fetch.continueRequest`). */
    const answered = (t: FakeTransport, method: string) => t.calls.filter((c) => c.method === method).map((c) => c.params?.requestId);
    const listed = (url: string, type: WorkerType, mimeType = 'text/javascript', workerUrl = W) => ({
      url,
      kind: 'Script',
      mimeType,
      status: 200,
      worker: { type, url: workerUrl },
      workerId: 'W1',
    });

    it.each([
      ['worker', ['Network.enable', 'Network.setCacheDisabled', 'Network.setBypassServiceWorker']],
      ['shared_worker', ['Fetch.enable', 'Network.enable', 'Network.setCacheDisabled', 'Network.setBypassServiceWorker']],
      ['service_worker', ['Fetch.enable', 'Network.enable', 'Network.setCacheDisabled']],
      ['worklet', ['Network.enable']],
    ] as const)('sends a %s session its whole setup before attach() awaits anything', (type, methods) => {
      const { transport, engine } = worker(type);
      void engine.attach();
      // A waiting service or shared worker answers Network commands only once it's resumed, right after this.
      expect(transport.methods()).toEqual(methods);
    });

    it.each(['worker', 'worklet'] as const)('never sends a %s session Page or Fetch commands (it has neither domain)', async (type) => {
      const { transport, engine } = worker(type, [override({})]);
      await engine.attach();
      await engine.applySettings();
      await engine.refreshInterception();
      engine.detach();
      expect(transport.methods().filter((m) => /^(Page|Fetch)\./.test(m))).toEqual([]);
    });

    it("copies the page's cache and service worker settings to a worker session (the page's don't reach what it loads)", async () => {
      const { transport, engine, settings } = worker('worker');
      settings.disableCache = false;
      settings.bypassServiceWorker = false;
      await engine.attach();
      expect(transport.calls.slice(1)).toEqual([
        { method: 'Network.setCacheDisabled', params: { cacheDisabled: false } },
        { method: 'Network.setBypassServiceWorker', params: { bypass: false } },
      ]);
      settings.disableCache = true;
      transport.calls = [];
      await engine.applySettings();
      expect(transport.calls).toEqual([
        { method: 'Network.setCacheDisabled', params: { cacheDisabled: true } },
        { method: 'Network.setBypassServiceWorker', params: { bypass: false } },
      ]);
    });

    it("keeps Fetch on a service or shared worker, never disabling it (its scripts' patterns are always there)", async () => {
      for (const type of ['service_worker', 'shared_worker'] as const) {
        const { transport, engine, overrides } = worker(type);
        await engine.attach();
        overrides.push(override({}));
        await engine.refreshInterception();
        overrides.length = 0;
        await engine.refreshInterception();
        await engine.applySettings();
        // A shared worker whose session had Fetch off (or no patterns) is never paused again.
        const scripts = [
          { urlPattern: '*', resourceType: 'Script', requestStage: 'Response' },
          { urlPattern: '*', resourceType: 'Other', requestStage: 'Response' },
        ];
        expect(transport.calls.filter((c) => c.method.startsWith('Fetch.'))).toEqual([
          { method: 'Fetch.enable', params: { patterns: scripts } },
          { method: 'Fetch.enable', params: { patterns: [...computeFetchPatterns([override({})], DEFAULT_SETTINGS), ...scripts] } },
          { method: 'Fetch.enable', params: { patterns: scripts } },
          { method: 'Fetch.enable', params: { patterns: scripts } },
        ]);
      }
    });

    it("lists a service worker's scripts from their pauses, and knows it installed through its session, when its session reports nothing (another debugger resumed it first)", async () => {
      const lib = override({ id: 'lib', match: exact('https://a.com/lib.js'), updatedAt: 1 });
      const { transport, engine, events } = worker('service_worker', [lib]);
      await engine.attach();
      transport.emit('Fetch.requestPaused', { requestId: 'j1', resourceType: 'Other', request: { url: W, method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
      transport.emit('Fetch.requestPaused', { requestId: 'j2', resourceType: 'Script', request: { url: 'https://a.com/lib.js', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
      await flush();
      transport.emit('Inspector.workerScriptLoaded', {});
      expect(engine.listResources().map((e) => [e.url, e.overrideId])).toEqual([
        [W, undefined],
        ['https://a.com/lib.js', 'lib'],
      ]);
      expect(events.filter((e) => e.type === 'override-missed')).toEqual([]);
      // Installed through the session: up to date until an override changes.
      expect(engine.isOutdated()).toBe(false);
      lib.updatedAt = 2;
      expect(engine.isOutdated()).toBe(true);
    });

    it("pauses a shared worker's scripts and lists them from the pause (its session may start reporting too late)", async () => {
      const lib = override({ id: 'lib', match: exact('https://a.com/lib.js') });
      const { transport, engine, events, overrides } = worker('shared_worker', [lib]);
      await engine.attach();
      overrides.length = 0;
      await engine.refreshInterception();
      const scripts = [
        { urlPattern: '*', resourceType: 'Script', requestStage: 'Response' },
        { urlPattern: '*', resourceType: 'Other', requestStage: 'Response' },
      ];
      expect(transport.calls.filter((c) => c.method === 'Fetch.enable').map((c) => c.params)).toEqual([
        { patterns: [...computeFetchPatterns([lib], DEFAULT_SETTINGS), ...scripts] },
        { patterns: scripts },
      ]);
      overrides.push(lib);
      transport.emit('Fetch.requestPaused', { requestId: 'j1', networkId: 'n1', resourceType: 'Script', request: { url: 'https://a.com/lib.js', method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
      transport.emit('Fetch.requestPaused', { requestId: 'j2', resourceType: 'Other', request: { url: 'https://a.com/dep.js', method: 'GET' }, responseStatusCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript; charset=utf-8' }] });
      transport.emit('Fetch.requestPaused', { requestId: 'j3', resourceType: 'Script', request: { url: 'https://a.com/gone.js', method: 'GET' }, responseErrorReason: 'Failed' });
      await flush();
      expect(transport.calls.filter((c) => c.method === 'Fetch.continueRequest').map((c) => c.params)).toEqual([{ requestId: 'j2' }, { requestId: 'j3' }]);
      expect(engine.listResources()).toEqual([
        { url: 'https://a.com/lib.js', kind: 'Script', mimeType: 'text/javascript', status: 200, overrideId: 'lib', worker: { type: 'shared_worker', url: W }, workerId: 'W1' },
        { url: 'https://a.com/dep.js', kind: 'Script', mimeType: 'application/javascript', status: 200, worker: { type: 'shared_worker', url: W }, workerId: 'W1' },
      ]);
      // Reported by the session as well: listed once.
      transport.emit('Network.responseReceived', { requestId: 'n1', type: 'Other', response: { url: 'https://a.com/lib.js', status: 200, mimeType: 'text/javascript' } });
      expect(engine.listResources()).toHaveLength(2);
      expect(missed(events)).toEqual([]);
    });

    it("re-applies a worker's settings without waiting for Network replies (a stopped service worker sends none)", async () => {
      const { transport, engine } = worker('service_worker', [override({})]);
      transport.hanging.add('Network.enable');
      transport.hanging.add('Network.setCacheDisabled');
      void engine.attach();
      transport.calls = [];
      await engine.applySettings();
      expect(transport.methods()).toEqual(['Network.setCacheDisabled', 'Fetch.enable']);
    });

    it('lists the scripts a worker loads, stamped with the worker', async () => {
      const { transport, engine } = worker('worker');
      await engine.attach();
      // importScripts is reported as Other, module imports as Script.
      response(transport, 'r1', LIB, 'Other', 'application/javascript');
      response(transport, 'r2', 'https://a.com/mod.js', 'Script');
      // Not scripts the worker runs.
      response(transport, 'r3', 'https://a.com/data.json', 'Other', 'application/json');
      response(transport, 'r4', 'https://a.com/api.js', 'Fetch');
      expect(engine.listResources()).toEqual([listed(LIB, 'worker', 'application/javascript'), listed('https://a.com/mod.js', 'worker')]);
    });

    it("labels a worker's files with the worker, never a frame (whatever frame id a response carries)", async () => {
      const { transport, engine } = worker('shared_worker');
      await engine.attach();
      transport.emit('Network.responseReceived', { requestId: 'r1', type: 'Other', frameId: 'T-W1', response: { url: LIB, status: 200, mimeType: 'text/javascript' } });
      expect(engine.listResources()).toEqual([listed(LIB, 'shared_worker')]);
    });

    it("lists a worker's first script from its response, once, under the URL it was redirected to", async () => {
      const { transport, engine, events } = worker('worker');
      await engine.attach();
      const V2 = 'https://a.com/v2/w.js';
      requested(transport);
      response(transport, 'T-W1', V2);
      finished(transport);
      response(transport, 'r1', LIB, 'Other');
      expect(engine.listResources()).toEqual([listed(V2, 'worker', undefined, V2), listed(LIB, 'worker', undefined, V2)]);
      expect(events.filter((e) => e.type === 'resource')).toHaveLength(2);
    });

    it("lists a service worker's first script from its response, under the worker's target id, once", async () => {
      const { transport, engine, events } = worker('service_worker');
      await engine.attach();
      requested(transport);
      response(transport, 'T-W1', W);
      finished(transport);
      transport.emit('Inspector.workerScriptLoaded', {});
      expect(events).toEqual([{ type: 'resource', resource: listed(W, 'service_worker') }]);
    });

    it("lists a service worker's first script when it finishes loading if no response event came, once", async () => {
      const { transport, engine, events } = worker('service_worker');
      await engine.attach();
      const V2 = 'https://a.com/v2/w.js';
      requested(transport);
      requested(transport, V2);
      finished(transport);
      transport.emit('Inspector.workerScriptLoaded', {});
      expect(events).toEqual([{ type: 'resource', resource: listed(V2, 'service_worker', undefined, V2) }]);
    });

    it("lists an installed service worker's first script when it starts (nothing is fetched, so nothing is missed)", async () => {
      const { transport, engine, events } = worker('service_worker', [override({ match: exact(W) })]);
      await engine.attach();
      transport.emit('Inspector.workerScriptLoaded', {});
      // Stopped, then started again on the same session.
      transport.emit('Inspector.workerScriptLoaded', {});
      expect(events).toEqual([{ type: 'resource', resource: listed(W, 'service_worker') }]);
    });

    it("lists no first script for a worklet (its target URL is its document's)", async () => {
      const { transport, engine } = worker('worklet');
      await engine.attach();
      transport.emit('Inspector.workerScriptLoaded', {});
      expect(engine.listResources()).toEqual([]);
    });

    it("credits a file served on its frame's session when the worker's session reports it", async () => {
      const servedBy = new Map<string, string>();
      const overrides = [override({ id: 'w', match: exact(W) }), override({ id: 'lib', match: exact(LIB) })];
      const page = await setup(overrides, undefined, { servedBy });
      const { transport, engine, events } = worker('worker', overrides, { servedBy });
      // The page's session serves the worker's first script (its network id is the worker's target id)…
      paused(page.transport, 'T-W1', W, 'Other');
      await flush();
      // …and the worker's session, attached after that, reports it.
      await engine.attach();
      response(transport, 'T-W1', W);
      paused(page.transport, 'r1', LIB, 'Script');
      await flush();
      response(transport, 'r1', LIB, 'Other');
      expect(engine.listResources().map((r) => r.overrideId)).toEqual(['w', 'lib']);
      expect(missed([...page.events, ...events])).toEqual([]);
      expect(servedBy.size).toBe(0);
    });

    it("credits a service worker's own script served before its session reported it (no network id) to the worker's id", async () => {
      const { transport, engine, events } = worker('service_worker', [override({ id: 'w', match: exact(W) })]);
      await engine.attach();
      // A new version's first pause, with no requestWillBeSent before it.
      transport.emit('Fetch.requestPaused', { requestId: 'job-1', resourceType: 'Other', request: { url: W, method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
      await flush();
      response(transport, 'T-W1', W);
      finished(transport);
      expect(engine.listResources()).toEqual([{ ...listed(W, 'service_worker'), overrideId: 'w' }]);
      expect(missed(events)).toEqual([]);
    });

    it("credits nothing else a service worker loads without a network id to the worker's id", async () => {
      const { transport, engine } = worker('service_worker', [override({ id: 'w', match: exact(W) }), override({ id: 'lib', match: exact(LIB) })]);
      await engine.attach();
      transport.emit('Fetch.requestPaused', { requestId: 'job-1', resourceType: 'Other', request: { url: LIB, method: 'GET' }, responseStatusCode: 200, responseHeaders: [] });
      await flush();
      response(transport, 'T-W1', W);
      // The import itself is listed from its pause, as served; the worker's own script isn't credited with it.
      expect(engine.listResources().find((e) => e.url === W)).toEqual(listed(W, 'service_worker'));
    });

    describe('while the page bypasses service workers', () => {
      it("continues a service worker's own fetches unmodified (a precache would keep the edit in its caches)", async () => {
        const { transport, engine, events } = worker('service_worker', [override({ match: exact(LIB) })]);
        await engine.attach();
        paused(transport, 'x1', LIB, 'XHR');
        paused(transport, 'x2', LIB, 'Fetch');
        // Its own scripts are still served.
        paused(transport, 's1', LIB, 'Script');
        paused(transport, 's2', LIB, 'Other');
        await flush();
        expect(answered(transport, 'Fetch.continueRequest')).toEqual(['job-x1', 'job-x2']);
        expect(answered(transport, 'Fetch.fulfillRequest')).toEqual(['job-s1', 'job-s2']);
        expect(events.filter((e) => e.type === 'override-served')).toHaveLength(2);
      });

      it("still serves the page's and other workers' fetches", async () => {
        const page = await setup([override({ match: exact(LIB) })]);
        const shared = worker('shared_worker', [override({ match: exact(LIB) })]);
        await shared.engine.attach();
        paused(page.transport, 'x1', LIB, 'XHR');
        paused(shared.transport, 'x2', LIB, 'XHR');
        await flush();
        expect(answered(page.transport, 'Fetch.fulfillRequest')).toEqual(['job-x1']);
        expect(answered(shared.transport, 'Fetch.fulfillRequest')).toEqual(['job-x2']);
      });
    });

    it("serves a service worker's fetches when the page doesn't bypass it (they answer the page's requests)", async () => {
      const { transport, engine, settings } = worker('service_worker', [override({ match: exact(LIB) })]);
      settings.bypassServiceWorker = false;
      await engine.attach();
      paused(transport, 'x1', LIB, 'XHR');
      await flush();
      expect(answered(transport, 'Fetch.fulfillRequest')).toEqual(['job-x1']);
    });

    describe("says why a worker's script wasn't served", () => {
      const overrides = [override({ id: 'w', match: exact(W) }), override({ id: 'lib', match: exact(LIB) })];

      it('a worker started by another worker: Chromium pauses its first script nowhere', async () => {
        const { transport, engine, events } = worker('worker', overrides, {}, true);
        await engine.attach();
        response(transport, 'T-W1', W);
        // What it loads is paused on its frame's session: a miss there has no known reason.
        response(transport, 'r1', LIB, 'Other');
        expect(missed(events)).toEqual([
          { type: 'override-missed', overrideId: 'w', url: W, reason: 'nested-worker' },
          { type: 'override-missed', overrideId: 'lib', url: LIB },
        ]);
      });

      it("a service worker's first script reinstalled by Chromium's update check: reported under another request id, paused nowhere", async () => {
        const { transport, engine, events, overrides: current } = worker('service_worker', [...overrides]);
        await engine.attach();
        // What the new version's session reports.
        transport.emit('Network.requestWillBeSent', { requestId: 'u1', type: 'Other', request: { url: W } });
        response(transport, 'u1', W, 'Other');
        transport.emit('Inspector.workerScriptLoaded', {});
        transport.emit('Network.loadingFinished', { requestId: 'u1' });
        expect(missed(events)).toEqual([{ type: 'override-missed', overrideId: 'w', url: W, reason: 'service-worker-update' }]);
        // Listed once, as its first script.
        expect(events.filter((e) => e.type === 'resource')).toEqual([{ type: 'resource', resource: listed(W, 'service_worker') }]);
        // It runs the live file while an override matches it: the next reload reinstalls it.
        expect(engine.isOutdated()).toBe(true);
        // Installed through this session: only its own scripts count.
        current.splice(0, 1);
        expect(engine.isOutdated()).toBe(false);
      });

      it("an import a service worker's session never paused: fetched by the update check too", async () => {
        const { transport, engine, events } = worker('service_worker', overrides);
        await engine.attach();
        response(transport, 'r1', LIB, 'Other');
        expect(missed(events)).toEqual([{ type: 'override-missed', overrideId: 'lib', url: LIB, reason: 'service-worker-update' }]);
      });

      it("none for a script paused on a service worker's session but not served (the override was turned on meanwhile)", async () => {
        const lib = override({ id: 'lib', match: exact(LIB), enabled: false });
        const { transport, engine, events } = worker('service_worker', [lib]);
        await engine.attach();
        paused(transport, 'r1', LIB, 'Script');
        await flush();
        lib.enabled = true;
        response(transport, 'r1', LIB, 'Other');
        expect(missed(events)).toEqual([{ type: 'override-missed', overrideId: 'lib', url: LIB }]);
      });

      it.each(['worker', 'shared_worker'] as const)('none for a %s started by a page (a reload usually fixes it)', async (type) => {
        const { transport, engine, events } = worker(type, overrides);
        await engine.attach();
        response(transport, 'T-W1', W);
        expect(missed(events)).toEqual([{ type: 'override-missed', overrideId: 'w', url: W }]);
      });
    });

    describe('isOutdated', () => {
      it.each(['worker', 'shared_worker', 'worklet'] as const)('is false for a %s (only service workers keep installed scripts)', async (type) => {
        const { engine } = worker(type, [override({ match: exact(W) })]);
        await engine.attach();
        expect(engine.isOutdated()).toBe(false);
      });

      it('installed before its session attached: outdated while its site has script overrides (what it imported is unknown)', async () => {
        const { transport, engine, overrides } = worker('service_worker');
        await engine.attach();
        transport.emit('Inspector.workerScriptLoaded', {});
        expect(engine.isOutdated()).toBe(false);
        overrides.push(override({ id: 'css', kind: 'Stylesheet', sourceUrl: 'https://a.com/app.css', match: exact('https://a.com/app.css') }));
        overrides.push(override({ id: 'other-site', sourceUrl: 'https://b.com/lib.js', match: exact('https://b.com/lib.js') }));
        expect(engine.isOutdated()).toBe(false);
        // Even turned off: the installed copy may still run it.
        overrides.push(override({ id: 'lib', sourceUrl: LIB, match: exact(LIB), enabled: false }));
        expect(engine.isOutdated()).toBe(true);
        // Loading its own URL later (a fetch() of it) doesn't make what it imported known.
        response(transport, 'f1', W, 'Fetch');
        expect(engine.isOutdated()).toBe(true);
      });

      it('installed through its session: outdated once the override it was served is changed or turned off', async () => {
        const sw = override({ id: 'w', match: exact(W), updatedAt: 1 });
        const { transport, engine } = worker('service_worker', [sw]);
        await engine.attach();
        requested(transport);
        paused(transport, 'T-W1', W, 'Other');
        await flush();
        finished(transport);
        expect(engine.listResources()[0]?.overrideId).toBe('w');
        expect(engine.isOutdated()).toBe(false);
        sw.updatedAt = 2;
        expect(engine.isOutdated()).toBe(true);
        sw.updatedAt = 1;
        sw.enabled = false;
        expect(engine.isOutdated()).toBe(true);
      });

      it('installed live through its session: outdated once an override of its first script or an importScripts is added', async () => {
        const { transport, engine, overrides } = worker('service_worker');
        await engine.attach();
        requested(transport);
        finished(transport);
        response(transport, 'r1', LIB, 'Other');
        expect(engine.isOutdated()).toBe(false);
        overrides.push(override({ id: 'lib', match: exact(LIB) }));
        expect(engine.isOutdated()).toBe(true);
        overrides.splice(0, 1, override({ id: 'w', match: exact(W) }));
        expect(engine.isOutdated()).toBe(true);
      });

      it('tracks the override version each importScripts was served', async () => {
        const lib = override({ id: 'lib', match: exact(LIB), updatedAt: 1 });
        const { transport, engine } = worker('service_worker', [lib]);
        await engine.attach();
        requested(transport);
        finished(transport);
        paused(transport, 'r1', LIB, 'Script');
        await flush();
        response(transport, 'r1', LIB, 'Other');
        expect(engine.isOutdated()).toBe(false);
        lib.updatedAt = 2;
        expect(engine.isOutdated()).toBe(true);
      });
    });

    describe('a service worker attached again (its page left its site and came back)', () => {
      /** A service worker installed through its session: its first script live, `LIB` served `lib`. */
      async function installed(lib: Override) {
        const { transport, engine } = worker('service_worker', [lib]);
        await engine.attach();
        requested(transport);
        response(transport, 'T-W1', W);
        paused(transport, 'r1', LIB, 'Script');
        await flush();
        response(transport, 'r1', LIB, 'Other');
        return engine;
      }

      it('hands on what its session learnt', async () => {
        const engine = await installed(override({ id: 'lib', match: exact(LIB) }));
        expect(engine.serviceWorkerState()).toEqual({
          url: W,
          installSeen: true,
          servedScripts: new Map([[LIB, { resourceType: 'Script', version: 'lib@0' }]]),
          scripts: [listed(W, 'service_worker'), { ...listed(LIB, 'service_worker'), overrideId: 'lib' }],
        });
      });

      it.each(['worker', 'shared_worker', 'worklet'] as const)('has nothing to hand on for a %s', async (type) => {
        const { engine } = worker(type);
        await engine.attach();
        expect(engine.serviceWorkerState()).toBeUndefined();
      });

      it('lists its scripts again under its new session, and knows what they were served (nothing is fetched again)', async () => {
        const lib = override({ id: 'lib', match: exact(LIB), updatedAt: 1 });
        const previous = (await installed(lib)).serviceWorkerState();
        const { transport, engine, events } = worker('service_worker', [lib], { worker: { id: 'W2', type: 'service_worker', targetId: 'T-W1', url: W, previous } });
        await engine.attach();
        transport.emit('Inspector.workerScriptLoaded', {});
        const again = <T extends object>(entry: T) => ({ type: 'resource', resource: { ...entry, workerId: 'W2' } });
        expect(events).toEqual([again(listed(W, 'service_worker')), again({ ...listed(LIB, 'service_worker'), overrideId: 'lib' })]);
        expect(engine.isOutdated()).toBe(false);
        lib.updatedAt = 2;
        expect(engine.isOutdated()).toBe(true);
      });
    });

    it("holds a frame's Other pauses while shared workers are being set up, and nothing else", async () => {
      const SHARED = 'https://a.com/shared.js';
      let release!: () => void;
      let setups: Promise<void> | undefined = new Promise<void>((resolve) => (release = resolve));
      const { transport } = await setup([override({}), override({ id: 'shared', match: exact(SHARED) })], undefined, { workerSetups: () => setups });
      const fulfilled = () => transport.calls.filter((c) => c.method === 'Fetch.fulfillRequest').map((c) => c.params?.requestId);
      // A shared worker's first script must not start before the worker's own session intercepts.
      paused(transport, 'n1', SHARED, 'Other');
      paused(transport, 'n2', 'https://a.com/app.js', 'Script');
      await flush();
      expect(fulfilled()).toEqual(['job-n2']);
      setups = undefined;
      release();
      await flush();
      expect(fulfilled()).toEqual(['job-n2', 'job-n1']);
      paused(transport, 'n3', SHARED, 'Other');
      await flush();
      expect(fulfilled()).toEqual(['job-n2', 'job-n1', 'job-n3']);
    });

    it("never holds a worker session's own pauses", async () => {
      const { transport, engine } = worker('shared_worker', [override({ match: exact(LIB) })], { workerSetups: () => new Promise(() => undefined) });
      await engine.attach();
      paused(transport, 'r1', LIB, 'Other');
      await flush();
      expect(transport.methods()).toContain('Fetch.fulfillRequest');
    });
  });

  it('ignores data: and non-overridable resources', async () => {
    const { transport, engine } = await setup();
    transport.emit('Network.responseReceived', { requestId: '1', type: 'Script', response: { url: 'data:text/javascript,1', status: 200, mimeType: '' } });
    transport.emit('Network.responseReceived', { requestId: '2', type: 'Image', response: { url: 'https://a.com/x.png', status: 200, mimeType: '' } });
    expect(engine.listResources()).toEqual([]);
  });
});

describe('source map headers', () => {
  const script = (t: FakeTransport, requestId: string, url: string, headers?: Record<string, string>, type = 'Script') =>
    t.emit('Network.responseReceived', { requestId, type, frameId: 'main', response: { url, status: 200, mimeType: 'text/javascript', headers } });
  const paused = (t: FakeTransport, networkId: string, url: string, resourceType = 'Script') =>
    t.emit('Fetch.requestPaused', {
      requestId: `f-${networkId}`,
      networkId,
      resourceType,
      request: { url, method: 'GET' },
      responseStatusCode: 200,
      responseHeaders: [
        { name: 'content-type', value: 'text/javascript' },
        { name: 'SourceMap', value: 'app.js.map' },
      ],
    });

  it('remembers the SourceMap header of a listed script, in any letter case, else X-SourceMap', async () => {
    const { transport, engine } = await setup();
    transport.responses['Network.getResponseBody'] = { body: 'x();', base64Encoded: false };
    script(transport, 'r1', 'https://a.com/1.js', { SourceMap: '1.js.map' });
    script(transport, 'r2', 'https://a.com/2.js', { 'x-sourcemap': '/maps/2.js.map' });
    script(transport, 'r3', 'https://a.com/3.js', { 'X-SourceMap': 'old.map', sourcemap: 'new.map' });
    // A header sent twice arrives joined by a newline.
    script(transport, 'r4', 'https://a.com/4.js', { sourcemap: ' first.map \nsecond.map' });
    script(transport, 'r5', 'https://a.com/5.js');
    const mapOf = async (n: number) => (await engine.getResourceContent(`https://a.com/${n}.js`)).sourceMap;
    expect(await mapOf(1)).toBe('1.js.map');
    expect(await mapOf(2)).toBe('/maps/2.js.map');
    expect(await mapOf(3)).toBe('new.map');
    expect(await mapOf(4)).toBe('first.map');
    expect(await engine.getResourceContent('https://a.com/5.js')).not.toHaveProperty('sourceMap');
  });

  it('keeps the upstream SourceMap header of a file served from an override, although the served copy has none', async () => {
    const { transport, engine } = await setup([override({})], { ...DEFAULT_SETTINGS }, { fallbackFetch: async () => 'upstream();' });
    paused(transport, 'n1', 'https://a.com/app.js');
    await flush();
    const fulfill = transport.calls.find((c) => c.method === 'Fetch.fulfillRequest');
    expect(fulfill?.params?.responseHeaders).not.toContainEqual(expect.objectContaining({ name: 'SourceMap' }));
    script(transport, 'n1', 'https://a.com/app.js');
    expect(await engine.getResourceContent('https://a.com/app.js')).toMatchObject({ content: 'upstream();', sourceMap: 'app.js.map' });
  });

  it('forgets a stashed header for a fetch() response the list skips', async () => {
    const { transport, engine } = await setup([override({})], { ...DEFAULT_SETTINGS }, { fallbackFetch: async () => 'upstream();' });
    paused(transport, 'n1', 'https://a.com/app.js', 'Fetch');
    await flush();
    script(transport, 'n1', 'https://a.com/app.js', undefined, 'Fetch');
    // Were it kept, a later response with that id would pick it up.
    script(transport, 'n1', 'https://a.com/app.js');
    expect(await engine.getResourceContent('https://a.com/app.js')).not.toHaveProperty('sourceMap');
  });

  it('forgets stashed headers when the page navigates', async () => {
    const { transport, engine } = await setup([override({})], { ...DEFAULT_SETTINGS }, { fallbackFetch: async () => 'upstream();' });
    paused(transport, 'n1', 'https://a.com/app.js');
    await flush();
    transport.emit('Page.frameNavigated', { frame: { id: 'main', loaderId: 'next', url: 'https://a.com/' } });
    script(transport, 'n1', 'https://a.com/app.js');
    expect(await engine.getResourceContent('https://a.com/app.js')).not.toHaveProperty('sourceMap');
  });
});
