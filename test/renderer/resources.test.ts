import { beforeEach, describe, expect, it } from 'vitest';
import type { ResourceEntry, WorkerType } from '../../src/shared/types';
import { buildResourceRows, describeFrame, describeWorker, matchesQuery, uniqueResources, useResourceStore, workerScriptUrl } from '@/entities/resource';

const entry = (url: string, extra: Partial<ResourceEntry> = {}): ResourceEntry => ({
  url,
  kind: url.endsWith('.css') ? 'Stylesheet' : url.endsWith('.js') ? 'Script' : 'Document',
  mimeType: 'text/plain',
  status: 200,
  ...extra,
});

/** A file a worker reported: `url` defaults to the worker's own script. */
const inWorker = (type: WorkerType, workerUrl: string, workerId: string, url = workerUrl): ResourceEntry =>
  entry(url, { worker: { type, url: workerUrl }, workerId });

const urls = () => Object.values(useResourceStore.getState().byKey).map((e) => e.url);

describe('resource store', () => {
  // Not `reset()`: that keeps service and shared workers' files.
  beforeEach(() => useResourceStore.setState({ byKey: {} }));

  it('keeps the same URL per reporting iframe session and drops one session without touching the page', () => {
    const { add, dropIframe } = useResourceStore.getState();
    add(entry('https://cdn.test/lib.js'));
    add(entry('https://cdn.test/lib.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }));
    add(entry('https://w.test/w.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }));
    expect(Object.keys(useResourceStore.getState().byKey)).toHaveLength(3);
    dropIframe('S1');
    expect(Object.values(useResourceStore.getState().byKey).map((e) => e.url)).toEqual(['https://cdn.test/lib.js']);
  });

  it('keeps the same URL per worker and drops one worker without touching the page or other workers', () => {
    const { add, dropWorker } = useResourceStore.getState();
    add(entry('https://s.test/lib.js'));
    add(inWorker('worker', 'https://s.test/w.js', 'W1', 'https://s.test/lib.js'));
    add(inWorker('worker', 'https://s.test/w.js', 'W1'));
    add(inWorker('worker', 'https://s.test/w.js', 'W2', 'https://s.test/lib.js'));
    expect(Object.keys(useResourceStore.getState().byKey)).toHaveLength(4);
    dropWorker('W1');
    expect(Object.values(useResourceStore.getState().byKey).map((e) => [e.url, e.workerId])).toEqual([
      ['https://s.test/lib.js', undefined],
      ['https://s.test/lib.js', 'W2'],
    ]);
  });

  it("keeps service and shared workers' files through a top-level navigation, and nothing else", () => {
    const { addMany, reset } = useResourceStore.getState();
    addMany([
      entry('https://s.test/app.js'),
      entry('https://w.test/w.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }),
      inWorker('worker', 'https://s.test/worker.js', 'W1'),
      inWorker('worklet', 'https://s.test/', 'W2', 'https://s.test/worklet.js'),
      inWorker('shared_worker', 'https://s.test/shared.js', 'W3'),
      inWorker('service_worker', 'https://s.test/sw.js', 'W4'),
      inWorker('service_worker', 'https://s.test/sw.js', 'W4', 'https://s.test/sw-lib.js'),
    ]);
    reset();
    expect(urls()).toEqual(['https://s.test/shared.js', 'https://s.test/sw.js', 'https://s.test/sw-lib.js']);
    // They go when their worker does.
    useResourceStore.getState().dropWorker('W4');
    expect(urls()).toEqual(['https://s.test/shared.js']);
  });
});

describe('uniqueResources', () => {
  it("prefers the page's own entry, then same-process iframes, then cross-site iframes", () => {
    const list = uniqueResources({
      a: entry('https://x.test/a.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }),
      b: entry('https://x.test/a.js', { frame: { url: 'https://x.test/f.html', depth: 1 } }),
      c: entry('https://x.test/b.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }),
      d: entry('https://x.test/a.js'),
    });
    expect(list.find((e) => e.url.endsWith('a.js'))?.frame).toBeUndefined();
    expect(list).toHaveLength(2);
  });

  it('prefers the entry that was served from an override among equals', () => {
    const list = uniqueResources({ a: entry('https://x.test/a.js'), b: entry('https://x.test/a.js', { overrideId: 'o1' }) });
    expect(list[0].overrideId).toBe('o1');
  });

  it('ranks workers after the page and every iframe', () => {
    const lib = 'https://x.test/lib.js';
    const inIframe = entry(lib, { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } });
    const inSw = inWorker('service_worker', 'https://x.test/sw.js', 'W1', lib);
    const inDedicated = inWorker('worker', 'https://x.test/w.js', 'W2', lib);
    // Whatever the order they arrived in.
    expect(uniqueResources({ a: inSw, b: entry(lib), c: inIframe })).toEqual([entry(lib)]);
    expect(uniqueResources({ a: inDedicated, b: inIframe, c: inSw })).toEqual([inIframe]);
    expect(uniqueResources({ a: inSw, b: inDedicated })).toEqual([inSw]);
    // Among workers, the one an override served.
    const served = { ...inDedicated, overrideId: 'o1' };
    expect(uniqueResources({ a: inSw, b: served })).toEqual([served]);
  });
});

describe('buildResourceRows', () => {
  const entries = [
    entry('https://site.test/'),
    entry('https://site.test/static/js/main.123.js'),
    entry('https://site.test/static/js/vendor.456.js'),
    entry('https://site.test/static/css/app.css'),
    entry('https://cdn.test/lib/v2/lib.js', { frame: { url: 'https://widget.test/embed.html', depth: 1 } }),
  ];

  it('groups by origin, compacts single-child folders and puts documents first', () => {
    const rows = buildResourceRows(entries, '', new Set());
    expect(rows.map((r) => `${'  '.repeat(r.depth)}${r.type}:${r.label}`)).toEqual([
      'origin:cdn.test',
      '  folder:lib/v2',
      '    file:lib.js',
      'origin:site.test',
      '  folder:static',
      '    folder:css',
      '      file:app.css',
      '    folder:js',
      '      file:main.123.js',
      '      file:vendor.456.js',
      '  file:(index)',
    ]);
  });

  it('hides the contents of collapsed rows', () => {
    const rows = buildResourceRows(entries, '', new Set(['https://site.test']));
    expect(rows.filter((r) => r.type === 'file').map((r) => r.label)).toEqual(['lib.js']);
    expect(rows.find((r) => r.key === 'https://site.test')).toMatchObject({ type: 'origin', expanded: false, count: 4 });
  });

  it('filters by file URL or by the iframe that loaded it, expanding everything', () => {
    expect(buildResourceRows(entries, 'vendor', new Set(['https://site.test'])).filter((r) => r.type === 'file').map((r) => r.label)).toEqual(['vendor.456.js']);
    expect(buildResourceRows(entries, 'embed.html', new Set()).filter((r) => r.type === 'file').map((r) => r.label)).toEqual(['lib.js']);
  });

  it('matchesQuery is case-insensitive', () => {
    expect(matchesQuery(entries[1], 'MAIN')).toBe(true);
  });

  it("filters by the script URL of the worker that loaded a file, but not by a worklet's page URL", () => {
    const withWorkers = [
      ...entries,
      inWorker('service_worker', 'https://site.test/sw.js', 'W1', 'https://site.test/sw-lib.js'),
      inWorker('worklet', 'https://site.test/app/', 'W2', 'https://site.test/worklet.js'),
    ];
    const files = (query: string) => buildResourceRows(withWorkers, query, new Set()).filter((r) => r.type === 'file').map((r) => r.label);
    expect(files('SW.JS')).toEqual(['sw-lib.js']);
    expect(files('/app/')).toEqual([]);
    expect(files('worklet')).toEqual(['worklet.js']);
  });
});

describe('describeFrame', () => {
  it('names the iframe and its depth', () => {
    expect(describeFrame(entry('https://x.test/a.js'))).toBeNull();
    expect(describeFrame(entry('https://c.test/a.js', { frame: { url: 'https://w.test/embed.html', depth: 1 } }))).toBe('Loaded in iframe w.test/embed.html');
    expect(describeFrame(entry('https://c.test/a.js', { frame: { url: 'https://n.test/', depth: 2 } }))).toBe('Loaded in nested iframe n.test/');
    expect(describeFrame(entry('https://w.test/embed.html', { frame: { url: 'https://w.test/embed.html', depth: 1 } }))).toBe('Document of an iframe');
  });
});

describe('describeWorker', () => {
  it('names the worker that loaded a file, or says the file is its own script', () => {
    expect(describeWorker(entry('https://x.test/a.js'))).toBeNull();
    expect(describeWorker(inWorker('worker', 'https://x.test/workers/worker.js', 'W1', 'https://x.test/lib.js'))).toBe('Loaded by worker worker.js');
    expect(describeWorker(inWorker('worker', 'https://x.test/workers/worker.js', 'W1'))).toBe('Worker script');
    expect(describeWorker(inWorker('shared_worker', 'https://x.test/shared.js', 'W2', 'https://x.test/lib.js'))).toBe('Loaded by shared worker shared.js');
    expect(describeWorker(inWorker('shared_worker', 'https://x.test/shared.js', 'W2'))).toBe('Shared worker script');
    expect(describeWorker(inWorker('service_worker', 'https://x.test/sw.js?v=3', 'W3', 'https://x.test/sw-lib.js'))).toBe('Loaded by service worker sw.js');
    expect(describeWorker(inWorker('service_worker', 'https://x.test/sw.js', 'W3'))).toBe('Service worker script');
    expect(describeWorker(inWorker('worklet', 'https://x.test/', 'W4', 'https://x.test/worklet.js'))).toBe('Loaded by a worklet');
  });

  it('calls a blob: or data: worker an inline one', () => {
    expect(describeWorker(inWorker('worker', 'blob:https://x.test/1b2c-3d4e', 'W1', 'https://x.test/lib.js'))).toBe('Loaded by an inline worker');
    expect(describeWorker(inWorker('shared_worker', 'data:text/javascript,importScripts("/lib.js")', 'W2', 'https://x.test/lib.js'))).toBe(
      'Loaded by an inline shared worker',
    );
  });

  it("gives a worker's script URL, but none for a worklet (its URL is the page's)", () => {
    expect(workerScriptUrl(entry('https://x.test/a.js'))).toBeUndefined();
    expect(workerScriptUrl(inWorker('service_worker', 'https://x.test/sw.js', 'W1', 'https://x.test/lib.js'))).toBe('https://x.test/sw.js');
    expect(workerScriptUrl(inWorker('worklet', 'https://x.test/', 'W2', 'https://x.test/worklet.js'))).toBeUndefined();
  });
});
