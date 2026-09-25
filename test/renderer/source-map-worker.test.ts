import { beforeEach, describe, expect, it } from 'vitest';
import beautify from 'js-beautify';
import { BEAUTIFY_OPTIONS } from '@/shared/lib/format/constants';
import { handleSourceMapRequest, type LoadedMaps } from '@/shared/lib/source-map/host';
import { rememberMap } from '@/shared/lib/source-map/host/rememberMap';
import { decodeDataUrl, mapText, resolveSourceUrl } from '@/shared/lib/source-map/host/parse';
import { lineStarts } from '@/shared/lib/source-map/host/align';
import type { LoadedMap } from '@/shared/lib/source-map/host/types';
import type { SourceMapRequestOf, SourceMapRequestType } from '@/shared/lib/source-map/types';
import { encodeVlq, MAIN_JS, MAIN_JS_ANCHORS, MAIN_JS_MAP, MAIN_JS_SOURCES, MAIN_SOURCE } from '../fixtures/sourceMaps';

const BUNDLE_URL = 'https://site.test/static/js/main.3f9a1c2b.js';
const MAP_URL = `${BUNDLE_URL}.map`;
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const bytes = (s: string) => new TextEncoder().encode(s);
/** Where the fixture's sources resolve: `./` dropped, as URL parsing does. */
const urlOf = (source: number) => MAIN_JS_SOURCES[source]!.url.replace('/./', '/');
const lineOf = (s: string, offset: number) => s.slice(0, offset).split('\n').length;

let maps: LoadedMaps;
const ask = <T extends SourceMapRequestType>(request: SourceMapRequestOf<T>) => handleSourceMapRequest(maps, request);
const load = (map: string, bundle: string | null = MAIN_JS, bundleUrl = BUNDLE_URL, mapUrl: string | null = MAP_URL) =>
  ask({ type: 'load', bundleUrl, mapUrl, bundle, map: { type: 'bytes', bytes: bytes(map) } });

beforeEach(() => {
  maps = new Map();
});

describe('parsing', () => {
  it('decodes data: URLs: base64 with and without padding, percent-encoded, with a charset, with an empty media type', () => {
    const decoded = (url: string) => {
      const result = decodeDataUrl(url, 1024);
      return result.ok ? text(result.value) : result;
    };
    expect(decoded('data:application/json;base64,eyJhIjoxfQ==')).toBe('{"a":1}');
    expect(decoded('data:application/json;base64,eyJhIjoxfQ')).toBe('{"a":1}');
    expect(decoded('data:application/json;base64,eyJh\n IjoxfQ==')).toBe('{"a":1}');
    expect(decoded('data:application/json,%7B%22a%22%3A1%7D')).toBe('{"a":1}');
    expect(decoded('data:application/json;charset=utf-8;base64,eyLDqSI6MX0=')).toBe('{"é":1}');
    expect(decoded('data:,%7B%7D')).toBe('{}');
    expect(decoded('data:application/json,{"%C3%A9":"%"}')).toBe('{"é":"%"}');
  });

  it('refuses a malformed or oversized data: URL', () => {
    expect(decodeDataUrl('data:application/json;base64', 1024)).toMatchObject({ ok: false, failure: 'invalid-data-url' });
    expect(decodeDataUrl('data:application/json;base64,@@@', 1024)).toMatchObject({ ok: false, failure: 'invalid-data-url' });
    expect(decodeDataUrl('data:application/json;base64,eyJhIjoxfQ==', 3)).toMatchObject({ ok: false, failure: 'too-large' });
    expect(decodeDataUrl('data:,abcdef', 3)).toMatchObject({ ok: false, failure: 'too-large' });
  });

  it("strips a BOM and the )]}' prefix", () => {
    expect(mapText(bytes('﻿{"a":1}'))).toEqual({ ok: true, value: { a: 1 } });
    expect(mapText(bytes(")]}'\n{\"a\":1}"))).toEqual({ ok: true, value: { a: 1 } });
  });

  it('says an HTML page is not a source map', () => {
    expect(mapText(bytes('<!doctype html><div id="root"></div>'))).toEqual({ ok: false, failure: 'not-a-map', detail: '' });
    expect(mapText(bytes('\n  <html>'))).toMatchObject({ ok: false, failure: 'not-a-map' });
  });

  it('rejects invalid JSON and maps without mappings or sources, saying why', () => {
    expect(mapText(bytes('{"version":'))).toMatchObject({ ok: false, failure: 'invalid' });
    expect(load('[]')).toEqual({ ok: false, failure: 'invalid', detail: 'the source map is not a JSON object' });
    expect(load('{"version":3,"sources":[]}')).toEqual({ ok: false, failure: 'invalid', detail: 'its mappings are not a string' });
    expect(load('{"version":3,"mappings":""}')).toEqual({ ok: false, failure: 'invalid', detail: 'its sources are not a list' });
    expect(load('{"sections":[{"map":{}}]}')).toEqual({ ok: false, failure: 'invalid', detail: 'a section has no offset' });
  });

  it('flattens index maps with nested sections, keeping every copy of a repeated source', () => {
    // Two generated lines: line 1 from a.ts, line 2 from a.ts (again) and b.ts, in a nested section.
    const a = { version: 3, sources: ['src/a.ts'], sourcesContent: ['const a = 1;\nconst b = 2;\n'], names: [], mappings: 'AAAA' };
    const nested = { version: 3, sources: ['src/a.ts', 'src/b.ts'], sourcesContent: [null, 'b();\n'], names: [], mappings: 'AACA,MCDA' };
    const map = {
      version: 3,
      sections: [
        { offset: { line: 0, column: 0 }, map: a },
        { offset: { line: 1, column: 0 }, map: { version: 3, sections: [{ offset: { line: 0, column: 0 }, map: nested }] } },
      ],
    };
    const bundle = 'var a=1;\nvar b=2;b();\n';
    const reply = load(JSON.stringify(map), bundle);
    expect(reply).toEqual({
      ok: true,
      sources: [
        { url: 'https://site.test/static/js/src/a.ts', hasContent: true, library: false },
        { url: 'https://site.test/static/js/src/b.ts', hasContent: true, library: false },
      ],
    });
    // a.ts line 2 is only in the nested copy of the file.
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: 'https://site.test/static/js/src/a.ts', line: 2 })).toMatchObject({ rawOffset: bundle.indexOf('var b') });
    expect(ask({ type: 'content', bundleUrl: BUNDLE_URL, url: 'https://site.test/static/js/src/a.ts' })).toEqual({ content: a.sourcesContent[0] });
    const view = { key: 'raw', text: bundle };
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view, offset: bundle.indexOf('b()') })).toMatchObject({ url: 'https://site.test/static/js/src/b.ts', line: 1 });
  });

  it('refuses sections with a url', () => {
    expect(load(JSON.stringify({ version: 3, sections: [{ offset: { line: 0, column: 0 }, url: 'x.map' }] }))).toEqual({
      ok: false,
      failure: 'unsupported-sections',
      detail: '',
    });
  });

  it('resolves sources like DevTools', () => {
    const base = 'https://x.com/static/js/main.js.map';
    const cases: [string, string | undefined, string][] = [
      ['webpack://fixture/./src/lib.ts', undefined, 'webpack://fixture/src/lib.ts'],
      // An empty sourceRoot is none (tsc and webpack write it), not a "/" prefix.
      ['webpack://fixture/./src/lib.ts', '', 'webpack://fixture/src/lib.ts'],
      // A root only prefixes relative sources, adding a / only when it lacks one.
      ['webpack://fixture/src/lib.ts', '/root', 'webpack://fixture/src/lib.ts'],
      ['a.ts', '/root', 'https://x.com/root/a.ts'],
      ['a.ts', '/root/', 'https://x.com/root/a.ts'],
      ['../src/a.ts', undefined, 'https://x.com/static/src/a.ts'],
      ['webpack://my-app/../shared/x.ts', undefined, 'webpack://my-app/shared/x.ts'],
      ['turbopack://[project]/src/page.tsx', undefined, 'turbopack://[project]/src/page.tsx'],
    ];
    for (const [source, root, expected] of cases) expect(resolveSourceUrl(source, root, base), source).toBe(expected);
    // An inline map resolves against the bundle (the loader passes the bundle's URL as the base).
    expect(resolveSourceUrl('src/c.ts', undefined, 'https://x.com/js/app.js')).toBe('https://x.com/js/src/c.ts');
  });

  it('lists each URL once, leaves out null sources, and marks text-less and library sources (ignore lists, node_modules)', () => {
    const map = {
      version: 3,
      sources: ['a.ts', null, 'node_modules/x/index.js', 'b.ts', 'a.ts'],
      sourcesContent: [null, null, 'x();', null, 'a();'],
      ignoreList: [3],
      names: [],
      mappings: 'AAAA',
    };
    expect(load(JSON.stringify(map))).toEqual({
      ok: true,
      sources: [
        { url: 'https://site.test/static/js/a.ts', hasContent: true, library: false },
        { url: 'https://site.test/static/js/node_modules/x/index.js', hasContent: true, library: true },
        { url: 'https://site.test/static/js/b.ts', hasContent: false, library: true },
      ],
    });
    // x_google_ignoreList counts when ignoreList is absent.
    expect(load(JSON.stringify({ ...map, ignoreList: undefined, x_google_ignoreList: [0, 4] }))).toMatchObject({ sources: [{ library: true }, {}, { library: false }] });
  });

  it("lists the fixture bundle's originals, with its bootstrap ignore-listed and without text", () => {
    expect(load(MAIN_JS_MAP)).toEqual({
      ok: true,
      sources: [
        ...[MAIN_SOURCE.lib, MAIN_SOURCE.dom, MAIN_SOURCE.store, MAIN_SOURCE.main].map((i) => ({ url: urlOf(i), hasContent: true, library: false })),
        { url: urlOf(MAIN_SOURCE.bootstrap), hasContent: false, library: true },
      ],
    });
  });
});

describe('lookups', () => {
  const pretty = beautify.js(MAIN_JS, BEAUTIFY_OPTIONS);

  it('maps every MAIN_JS anchor from the raw bundle to its original line and back, landing on its pretty line', () => {
    load(MAIN_JS_MAP);
    const raw = { key: 'raw', text: MAIN_JS };
    const view = { key: 'pretty', text: pretty };
    for (const anchor of MAIN_JS_ANCHORS) {
      const offset = MAIN_JS.indexOf(anchor.snippet);
      const url = urlOf(anchor.source);
      expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: raw, offset }), anchor.snippet).toEqual({ url, line: anchor.line, column: anchor.column + 1, mismatch: false });
      const bundle = ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url, line: anchor.line });
      expect(bundle, anchor.snippet).toEqual({ rawOffset: offset, line: anchor.line, mismatch: false });
      const inView = ask({ type: 'toView', bundleUrl: BUNDLE_URL, view, rawOffset: offset });
      expect('offset' in inView && lineOf(pretty, inView.offset), anchor.snippet).toBe(anchor.prettyLine);
      expect('offset' in inView && pretty.startsWith(anchor.snippet.replace(/\W.*/, ''), inView.offset), anchor.snippet).toBe(true);
    }
  });

  it("finds an original line's first bundle code, probing past comment-only lines and saying which line it used", () => {
    load(MAIN_JS_MAP);
    // main.ts line 11 is a comment: the code is on line 12.
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.main), line: 11 })).toEqual({
      rawOffset: MAIN_JS.indexOf('var n=document.querySelector("#main")'),
      line: 12,
      mismatch: false,
    });
    // lib.ts line 1 opens the object; its first property is on line 2.
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.lib), line: 1 })).toMatchObject({ line: 2 });
    // Past the end of the file, the nearest line above with code.
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.lib), line: 30 })).toMatchObject({ line: 20 });
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.lib), line: 500 })).toEqual({ miss: 'no-code-near' });
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: 'webpack://fixture/src/other.ts', line: 1 })).toEqual({ miss: 'unknown-source' });
  });

  it('answers need-view for an unknown tab version, then maps with its text and caches it', () => {
    load(MAIN_JS_MAP);
    const offset = pretty.indexOf('greet: function');
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: { key: 'tab:1' }, offset })).toEqual({ miss: 'need-view' });
    const expected = { url: urlOf(MAIN_SOURCE.lib), line: 3, column: 3, mismatch: false };
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: { key: 'tab:1', text: pretty }, offset })).toEqual(expected);
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: { key: 'tab:1' }, offset })).toEqual(expected);
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: { key: 'tab:2' }, offset })).toEqual({ miss: 'need-view' });
  });

  it("answers edited inside an edit, and lands at the edit's start from the original side", () => {
    load(MAIN_JS_MAP);
    // A changed price, and a statement the user added.
    const edited = pretty.replace('price: 12.5', 'price: 99.5').replace('function c() {', 'function c() {\n    audit();');
    const view = { key: 'edited', text: edited };
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view, offset: edited.indexOf('99.5') + 1 })).toEqual({ miss: 'edited' });
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view, offset: edited.indexOf('audit') })).toEqual({ miss: 'edited' });
    // Code before the first edit and after the last maps exactly.
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view, offset: edited.indexOf('greet: function') })).toMatchObject({ line: 3 });
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view, offset: edited.indexOf('window.mainValue') })).toMatchObject({ line: 17 });
    // store.ts line 9 (the items) begins before the first edit: exact. Line 15 is between the edits: where they start.
    const items = ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.store), line: 9 });
    expect('rawOffset' in items && ask({ type: 'toView', bundleUrl: BUNDLE_URL, view, rawOffset: items.rawOffset })).toEqual({ offset: edited.indexOf('var o = [{'), fit: 'exact' });
    const store = ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.store), line: 15 });
    expect('rawOffset' in store && ask({ type: 'toView', bundleUrl: BUNDLE_URL, view, rawOffset: store.rawOffset })).toEqual({ offset: edited.indexOf('99.5'), fit: 'edited' });
    // main.ts line 12 is after the last edit: exact again.
    const query = ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.main), line: 12 });
    expect('rawOffset' in query && ask({ type: 'toView', bundleUrl: BUNDLE_URL, view, rawOffset: query.rawOffset })).toEqual({ offset: edited.indexOf('var n = document'), fit: 'exact' });
  });

  it('answers no-bundle when the bundle text was not sent, and still reads originals', () => {
    load(MAIN_JS_MAP, null);
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: { key: 'x', text: pretty }, offset: 0 })).toEqual({ miss: 'no-bundle' });
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.lib), line: 3 })).toEqual({ miss: 'no-bundle' });
    expect(ask({ type: 'content', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.lib) })).toEqual({ content: MAIN_JS_SOURCES[MAIN_SOURCE.lib]!.content });
    expect(ask({ type: 'content', bundleUrl: BUNDLE_URL, url: urlOf(MAIN_SOURCE.bootstrap) })).toEqual({ miss: 'no-content' });
  });

  it('flags a map whose segments run past the bundle as mismatched, tolerating a few', () => {
    // 30 one-column segments on the first generated line, columns 0, 10, 20…
    const segments = Array.from({ length: 30 }, (_, i) => encodeVlq(i === 0 ? [0, 0, 0, 0] : [10, 0, 1, 0])).join(',');
    const map = JSON.stringify({ version: 3, sources: ['a.ts'], sourcesContent: ['x'], names: [], mappings: segments });
    const view = (bundle: string) => ({ key: bundle, text: bundle });
    // A 200-column line leaves 9 segments past its end: tolerated.
    load(map, 'x'.repeat(200));
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: view('x'.repeat(200)), offset: 0 })).toMatchObject({ mismatch: false });
    // A 100-column line leaves 19: another build's map.
    load(map, 'x'.repeat(100));
    expect(ask({ type: 'toOriginal', bundleUrl: BUNDLE_URL, view: view('x'.repeat(100)), offset: 0 })).toMatchObject({ mismatch: true });
  });

  it("answers outside-bundle for a mapping past the bundle's end", () => {
    const map = JSON.stringify({ version: 3, sources: ['a.ts'], sourcesContent: ['a\nb'], names: [], mappings: 'AAAA;AACA' });
    load(map, 'only one line');
    expect(ask({ type: 'toBundle', bundleUrl: BUNDLE_URL, url: 'https://site.test/static/js/a.ts', line: 2 })).toEqual({ miss: 'outside-bundle' });
  });

  it("answers unloaded for a bundle it doesn't hold", () => {
    const bundleUrl = 'https://site.test/other.js';
    expect(ask({ type: 'content', bundleUrl, url: 'a' })).toEqual({ miss: 'unloaded' });
    expect(ask({ type: 'toOriginal', bundleUrl, view: { key: 'k' }, offset: 0 })).toEqual({ miss: 'unloaded' });
    expect(ask({ type: 'toBundle', bundleUrl, url: 'a', line: 1 })).toEqual({ miss: 'unloaded' });
    expect(ask({ type: 'toView', bundleUrl, view: { key: 'k' }, rawOffset: 0 })).toEqual({ miss: 'unloaded' });
  });

  it('keeps at most 4 maps and 48 MB of map bytes, dropping the least recently used', () => {
    for (const n of [1, 2, 3, 4]) load(MAIN_JS_MAP, MAIN_JS, `https://site.test/${n}.js`);
    // Using 1 makes it the most recent, so 2 goes when a fifth arrives.
    ask({ type: 'content', bundleUrl: 'https://site.test/1.js', url: urlOf(MAIN_SOURCE.lib) });
    load(MAIN_JS_MAP, MAIN_JS, 'https://site.test/5.js');
    expect([...maps.keys()]).toEqual(['https://site.test/3.js', 'https://site.test/4.js', 'https://site.test/1.js', 'https://site.test/5.js']);

    const entry = (mapBytes: number) => ({ ...maps.get('https://site.test/5.js')!, mapBytes }) as LoadedMap;
    const budget: LoadedMaps = new Map();
    rememberMap(budget, 'a', entry(30 * 1024 * 1024));
    rememberMap(budget, 'b', entry(30 * 1024 * 1024));
    expect([...budget.keys()]).toEqual(['b']);
    // The newest stays even alone over the budget.
    rememberMap(budget, 'c', entry(60 * 1024 * 1024));
    expect([...budget.keys()]).toEqual(['c']);
  });

  it('splits generated lines on \\n only, keeping a CRLF’s \\r on its line', () => {
    expect([...lineStarts('a\r\nb\rc\nd')]).toEqual([0, 3, 7]);
  });
});
