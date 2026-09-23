import { describe, expect, it } from 'vitest';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { computeFetchPatterns, InterceptionEngine } from '../../src/main/engine/InterceptionEngine';
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
    base: '',
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

  it('resets the resource list on main-frame navigations only', async () => {
    const { transport, engine, events } = await setup();
    const response = (url: string) =>
      transport.emit('Network.responseReceived', {
        requestId: url,
        type: 'Script',
        response: { url, status: 200, mimeType: 'text/javascript' },
      });
    response('https://a.com/1.js');
    transport.emit('Network.requestWillBeSent', {
      requestId: 'iframe',
      loaderId: 'iframe',
      frameId: 'child',
      type: 'Document',
      documentURL: 'https://b.com/',
      request: { url: 'https://b.com/' },
    });
    expect(engine.listResources()).toHaveLength(1);
    transport.emit('Network.requestWillBeSent', {
      requestId: 'nav',
      loaderId: 'nav',
      frameId: 'main',
      type: 'Document',
      documentURL: 'https://a.com/',
      request: { url: 'https://a.com/' },
    });
    expect(engine.listResources()).toHaveLength(0);
    expect(events).toContainEqual({ type: 'navigated', url: 'https://a.com/' });
  });

  it('ignores data: and non-overridable resources', async () => {
    const { transport, engine } = await setup();
    transport.emit('Network.responseReceived', { requestId: '1', type: 'Script', response: { url: 'data:text/javascript,1', status: 200, mimeType: '' } });
    transport.emit('Network.responseReceived', { requestId: '2', type: 'Image', response: { url: 'https://a.com/x.png', status: 200, mimeType: '' } });
    expect(engine.listResources()).toEqual([]);
  });
});
