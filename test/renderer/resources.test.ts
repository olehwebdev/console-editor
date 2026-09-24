import { beforeEach, describe, expect, it } from 'vitest';
import type { ResourceEntry } from '../../src/shared/types';
import { buildResourceRows, describeFrame, matchesQuery, uniqueResources, useResourceStore } from '@/entities/resource';

const entry = (url: string, extra: Partial<ResourceEntry> = {}): ResourceEntry => ({
  url,
  kind: url.endsWith('.css') ? 'Stylesheet' : url.endsWith('.js') ? 'Script' : 'Document',
  mimeType: 'text/plain',
  status: 200,
  ...extra,
});

describe('resource store', () => {
  beforeEach(() => useResourceStore.getState().reset());

  it('keeps the same URL per reporting iframe session and drops one session without touching the page', () => {
    const { add, dropIframe } = useResourceStore.getState();
    add(entry('https://cdn.test/lib.js'));
    add(entry('https://cdn.test/lib.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }));
    add(entry('https://w.test/w.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }));
    expect(Object.keys(useResourceStore.getState().byKey)).toHaveLength(3);
    dropIframe('S1');
    expect(Object.values(useResourceStore.getState().byKey).map((e) => e.url)).toEqual(['https://cdn.test/lib.js']);
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
});

describe('describeFrame', () => {
  it('names the iframe and its depth', () => {
    expect(describeFrame(entry('https://x.test/a.js'))).toBeNull();
    expect(describeFrame(entry('https://c.test/a.js', { frame: { url: 'https://w.test/embed.html', depth: 1 } }))).toBe('Loaded in iframe w.test/embed.html');
    expect(describeFrame(entry('https://c.test/a.js', { frame: { url: 'https://n.test/', depth: 2 } }))).toBe('Loaded in nested iframe n.test/');
    expect(describeFrame(entry('https://w.test/embed.html', { frame: { url: 'https://w.test/embed.html', depth: 1 } }))).toBe('Document of an iframe');
  });
});
