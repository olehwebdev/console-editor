import { describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { computeFetchPatterns, InterceptionEngine, sha256 } from '../../src/main/engine/InterceptionEngine';
import { DEFAULT_SETTINGS, type EngineEvent, type Override } from '../../src/shared/types';

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

async function setup(overrides: Override[] = [], settings = { ...DEFAULT_SETTINGS }) {
  const transport = new FakeTransport();
  const events: EngineEvent[] = [];
  const engine = new InterceptionEngine({
    transport,
    getOverrides: () => overrides,
    getSettings: () => settings,
    emit: (e) => events.push(e),
  });
  await engine.attach();
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

  it('restricts regex overrides to their resource type', () => {
    const patterns = computeFetchPatterns(
      [override({ match: { type: 'regex', pattern: 'x', ignoreQuery: false } })],
      { ...DEFAULT_SETTINGS, stripIntegrity: false },
    );
    expect(patterns).toEqual([{ urlPattern: '*', resourceType: 'Script', requestStage: 'Response' }]);
  });

  it('keeps working with an override of a match type it does not know', () => {
    const unknown = { type: 'prefix', pattern: 'x', ignoreQuery: false } as unknown as Override['match'];
    const patterns = computeFetchPatterns([override({ match: unknown })], { ...DEFAULT_SETTINGS, stripIntegrity: false });
    expect(patterns).toEqual([{ urlPattern: '*', resourceType: 'Script', requestStage: 'Response' }]);
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
