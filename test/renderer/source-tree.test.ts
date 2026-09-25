import { describe, expect, it } from 'vitest';
import type { ResourceEntry } from '../../src/shared/types';
import type { OriginalSource } from '@/shared/lib';
import { buildResourceRows } from '@/entities/resource';
import {
  buildSourceRows,
  bundleNestKey,
  cleanLabel,
  describeFailure,
  parseSourceUrl,
  sourceGlyph,
  type IsOpen,
  type NestInput,
  type SourceMapFailure,
  type SourceMapState,
  type SourceRow,
} from '@/entities/source-map';
import { icons } from '@/shared/config';
import { bundlesMatching, withSourceRows, type ExplorerRow } from '@/widgets/explorer/lib';
import { MAIN_JS_SOURCES } from '../fixtures/sourceMaps';

const BUNDLE = 'https://site.test/static/js/main.js';
const source = (url: string, extra: Partial<OriginalSource> = {}): OriginalSource => ({ url, hasContent: true, library: false, ...extra });
const ready = (sources: OriginalSource[]): SourceMapState => ({ status: 'ready', bundleHash: 'h', mapUrl: `${BUNDLE}.map`, sources, browseOnly: false, mismatch: false, checked: 0 });
const byDefault: IsOpen = (_key, open) => open;
const nest = (overrides: Partial<NestInput> = {}): NestInput => ({ bundleUrl: BUNDLE, bundleKind: 'Script', parentKey: bundleNestKey(BUNDLE), depth: 0, isOpen: byDefault, query: '', ...overrides });
/** Each row as `  type:label (count)`, indented by depth. */
const show = (rows: readonly (SourceRow | ExplorerRow)[]) =>
  rows.map((r) => {
    const count = 'count' in r ? ` (${r.count})` : '';
    const label = r.type === 'source-status' ? r.message : r.label;
    return `${'  '.repeat(r.depth)}${r.type}:${label}${count}`;
  });
const entry = (url: string, kind: ResourceEntry['kind'] = 'Script'): ResourceEntry => ({ url, kind, mimeType: 'text/plain', status: 200 });

describe("a bundle's originals", () => {
  it('lists the fixture map: its one root left out, library code apart', () => {
    const sources = MAIN_JS_SOURCES.map(({ url, content }, i) => source(url.replace('/./', '/'), { hasContent: content !== null, library: i === 4 }));
    expect(show(buildSourceRows(nest(), ready(sources)))).toEqual([
      'source-folder:src (4)',
      '  source:dom.ts',
      '  source:lib.ts',
      '  source:main.ts',
      '  source:store.ts',
      'source-folder:Libraries (1)',
    ]);
  });

  it('groups sources by origin, or by scheme and host, never under a "null" origin', () => {
    const rows = buildSourceRows(nest(), ready([source('https://cdn.test/a/x.js'), source('webpack://app/src/y.ts'), source('file:///home/me/z.css')]));
    expect(show(rows)).toEqual([
      'source-folder:cdn.test (1)',
      '  source-folder:a (1)',
      '    source:x.js',
      'source-folder:file:// (1)',
      '  source-folder:home/me (1)',
      '    source:z.css',
      'source-folder:webpack://app (1)',
      '  source-folder:src (1)',
      '    source:y.ts',
    ]);
    expect(rows.filter((r) => r.type === 'source-folder' && r.depth === 0).map((r) => r.type === 'source-folder' && [r.variant, r.title])).toEqual([
      ['origin', 'https://cdn.test'],
      ['root', 'file://'],
      ['root', 'webpack://app'],
    ]);
  });

  it('compacts single-child folders, and lists folders before files, in the locale collation', () => {
    const rows = buildSourceRows(
      nest(),
      ready([source('webpack://app/src/deep/er/x.ts'), source('webpack://app/src/Zeta.ts'), source('webpack://app/src/alpha.ts'), source('webpack://app/src/%C3%A9t%C3%A9.ts')]),
    );
    expect(show(rows)).toEqual(['source-folder:src (4)', '  source-folder:deep/er (1)', '    source:x.ts', '  source:alpha.ts', '  source:été.ts', '  source:Zeta.ts']);
  });

  it('puts ignore-listed and node_modules sources in a collapsed Libraries group, which opens', () => {
    const state = ready([source('webpack://app/src/a.ts'), source('webpack://app/node_modules/react/index.js', { library: true }), source('webpack://app/webpack/bootstrap', { library: true })]);
    expect(show(buildSourceRows(nest(), state))).toEqual(['source-folder:src (1)', '  source:a.ts', 'source-folder:Libraries (2)']);
    const libraries = `${bundleNestKey(BUNDLE)}\u0000l`;
    const opened: IsOpen = (key, open) => (key === libraries ? !open : open);
    expect(show(buildSourceRows(nest({ isOpen: opened }), state)).slice(2)).toEqual([
      'source-folder:Libraries (2)',
      '  source-folder:node_modules/react (1)',
      '    source:index.js',
      '  source-folder:webpack (1)',
      '    source:bootstrap',
    ]);
  });

  it('shows a line instead while the map loads, when it failed, lists nothing, or is no longer held', () => {
    const line = (state: SourceMapState | undefined) => buildSourceRows(nest({ depth: 2 }), state).map((r) => r.type === 'source-status' && [r.status, r.message, r.depth]);
    expect(line({ status: 'loading' })).toEqual([['loading', 'Reading the source map…', 2]]);
    expect(line({ status: 'failed', failure: 'http', detail: '404', mapUrl: null })).toEqual([['failed', expect.stringContaining('HTTP 404'), 2]]);
    expect(line(ready([]))).toEqual([['empty', 'The source map lists no original files', 2]]);
    expect(line(undefined)).toEqual([['unloaded', expect.any(String), 2]]);
    expect(line({ status: 'none', bundleHash: 'h' })).toEqual([]);
  });

  it('parses turbopack://[project] and other unparseable URLs by splitting on /', () => {
    expect(parseSourceUrl('turbopack://[project]/app/page.tsx')).toEqual({ root: 'turbopack://[project]', dirs: ['app'], file: 'page.tsx' });
    expect(parseSourceUrl('webpack://app/src/App.vue?vue&type=script')).toEqual({ root: 'webpack://app', dirs: ['src'], file: 'App.vue?vue&type=script' });
    expect(parseSourceUrl('https://a.test/')).toEqual({ root: 'https://a.test', dirs: [], file: '(index)' });
    expect(parseSourceUrl('src/lib.ts')).toEqual({ root: '', dirs: ['src'], file: 'lib.ts' });
  });

  it('strips control characters from labels', () => {
    expect(cleanLabel('a\u0000b\u001bc\u007fd\ne')).toBe('abcde');
    expect(parseSourceUrl('webpack://app/src/%1B%5B31mevil.ts')).toMatchObject({ file: '[31mevil.ts' });
  });

  it('describes every failure in words', () => {
    const failures: SourceMapFailure[] = ['unreadable', 'bad-url', 'scheme', 'http', 'network', 'timeout', 'too-large', 'invalid-data-url', 'not-a-map', 'invalid', 'unsupported-sections', 'worker'];
    const texts = failures.map((failure) => describeFailure(failure, 'DETAIL', 'main.js'));
    expect(new Set(texts).size).toBe(failures.length);
    for (const text of texts) expect(text.length).toBeGreaterThan(10);
  });

  it("picks an original's glyph from its extension or a lang hint", () => {
    expect(sourceGlyph('lib.ts').icon).toBe(icons.TsIcon);
    expect(sourceGlyph('App.tsx').icon).toBe(icons.JsxIcon);
    expect(sourceGlyph('theme.SCSS')).toEqual({ icon: icons.CssIcon, className: 'text-kind-css' });
    expect(sourceGlyph('App.vue?vue&type=script&lang.ts').icon).toBe(icons.TsIcon);
    expect(sourceGlyph('App.vue?vue&type=template').icon).toBe(icons.HtmlIcon);
    expect(sourceGlyph('bootstrap').icon).toBe(icons.CodeFileIcon);
    expect(sourceGlyph('x.constructor').icon).toBe(icons.CodeFileIcon);
  });
});

describe('originals in the Explorer tree', () => {
  const entries = [entry(BUNDLE), entry('https://site.test/static/js/plain.js'), entry('https://site.test/app.css', 'Stylesheet'), entry('https://site.test/', 'Document')];
  const byBundle: Record<string, SourceMapState> = {
    [BUNDLE]: ready([source('webpack://app/src/a.ts'), source('webpack://app/src/b.ts', { hasContent: false })]),
    'https://site.test/static/js/plain.js': { status: 'none', bundleHash: 'h' },
  };
  const tree = (query = '', toggled: ReadonlySet<string> = new Set(), maps = byBundle) => {
    const isOpen: IsOpen = (key, open) => open !== toggled.has(key);
    const matching = bundlesMatching(maps, query);
    return withSourceRows(buildResourceRows(entries, query, new Set(), matching), { byBundle: maps, isOpen, query, matching });
  };
  const chevrons = (rows: ExplorerRow[]) => rows.flatMap((r) => (r.type === 'file' ? [[r.label, r.expanded, r.nest?.status ?? null]] : []));

  it('nests sources only under an expanded bundle, and gives no chevron to documents or to files known to have no map', () => {
    expect(chevrons(tree())).toEqual([
      ['main.js', false, 'ready'],
      ['plain.js', undefined, null],
      ['(index)', undefined, null],
      ['app.css', false, 'unknown'],
    ]);
    expect(tree().some((r) => r.type === 'source')).toBe(false);

    const rows = tree('', new Set([bundleNestKey(BUNDLE)]));
    expect(show(rows)).toEqual([
      'origin:site.test (4)',
      '  folder:static/js (2)',
      '    file:main.js',
      '      source-folder:src (2)',
      '        source:a.ts',
      '        source:b.ts',
      '    file:plain.js',
      '  file:(index)',
      '  file:app.css',
    ]);
    expect(rows.find((r) => r.type === 'file' && r.label === 'main.js')).toMatchObject({ expanded: true, nest: { status: 'ready', count: 2, mapUrl: `${BUNDLE}.map` } });
  });

  it('keys rows by bundle, so a file listed by two bundles appears under both, and every key is unique', () => {
    const other = 'https://site.test/static/js/other.js';
    const shared = ready([source('webpack://app/src/a.ts')]);
    const rows = withSourceRows(buildResourceRows([entry(BUNDLE), entry(other)], '', new Set()), {
      byBundle: { [BUNDLE]: shared, [other]: shared },
      isOpen: () => true,
      query: '',
      matching: new Set(),
    });
    expect(rows.filter((r) => r.type === 'source').map((r) => r.type === 'source' && r.bundleUrl)).toEqual([BUNDLE, other]);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it('while filtering, lists bundles whose loaded originals match and shows only those, open', () => {
    const rows = tree('b.ts');
    expect(show(rows)).toEqual(['origin:site.test (1)', '  folder:static/js (1)', '    file:main.js', '      source-folder:src (1)', '        source:b.ts']);
    // A bundle opened by hand shows what doesn't match as a line.
    expect(show(tree('main', new Set([bundleNestKey(BUNDLE)])))).toEqual([
      'origin:site.test (1)',
      '  folder:static/js (1)',
      '    file:main.js',
      '      source-status:No original files match “main”',
    ]);
  });

  it('shows a failed map on its bundle, which keeps its chevron', () => {
    const failed: Record<string, SourceMapState> = { [BUNDLE]: { status: 'failed', failure: 'http', detail: '404', mapUrl: `${BUNDLE}.map` } };
    const main = tree('', new Set(), failed).find((r) => r.type === 'file' && r.label === 'main.js');
    expect(main).toMatchObject({ expanded: false, nest: { status: 'failed', failure: expect.stringContaining('HTTP 404'), mapUrl: `${BUNDLE}.map` } });
  });
});
