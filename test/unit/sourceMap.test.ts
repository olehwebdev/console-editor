import { describe, expect, it } from 'vitest';
import {
  credentialsFor,
  findScriptMapComment,
  findStyleMapComment,
  loadSourceMap,
  pickMapReference,
  resolveMapUrl,
  SOURCE_MAP_LIMITS,
  type SourceMapDeps,
  type SourceMapLimits,
} from '../../src/main/sourceMap';
import type { ResourceContent } from '../../src/shared/types';

const BUNDLE = 'https://site.test/static/js/main.js';
const PAGE = 'https://site.test/app/';
const HASH = 'a'.repeat(64);

describe("finding a script's map comment", () => {
  it('reads the last trailing //# sourceMappingURL comment', () => {
    expect(findScriptMapComment('a();\n//# sourceMappingURL=main.js.map\n')).toBe('main.js.map');
    expect(findScriptMapComment('a();\n//# sourceMappingURL=old.map\n//# sourceMappingURL=new.map')).toBe('new.map');
  });

  it('accepts //@, spaces around the marker, and a one-line /*# … */', () => {
    expect(findScriptMapComment('a();\n//@ sourceMappingURL=x.map')).toBe('x.map');
    expect(findScriptMapComment('a();\n  //#   sourceMappingURL=x.map   ')).toBe('x.map');
    expect(findScriptMapComment('a();\n/*# sourceMappingURL=x.map */')).toBe('x.map');
  });

  it('skips blank lines, CRLF line ends and other trailing comments such as //# debugId', () => {
    expect(findScriptMapComment('a();\r\n//# sourceMappingURL=a.map\r\n//# debugId=85314830-023f\r\n\r\n')).toBe('a.map');
    expect(findScriptMapComment('a();\n//# sourceMappingURL=a.map\n/* built by x */\n')).toBe('a.map');
  });

  it('ignores a comment followed by code, and one inside a string or mid-file', () => {
    expect(findScriptMapComment('//# sourceMappingURL=a.map\nb();\n')).toBeNull();
    expect(findScriptMapComment('var t = `\n//# sourceMappingURL=evil.map\n`;\n')).toBeNull();
    expect(findScriptMapComment('var s = "//# sourceMappingURL=evil.map";\n')).toBeNull();
  });

  it('rejects a value with a quote or a backtick, or */ after it', () => {
    expect(findScriptMapComment('a();\n//# sourceMappingURL=a.map"')).toBeNull();
    expect(findScriptMapComment("a();\n//# sourceMappingURL=a'.map")).toBeNull();
    expect(findScriptMapComment('a();\n//# sourceMappingURL=a.map`')).toBeNull();
    expect(findScriptMapComment('a();\n//# sourceMappingURL=a.map*/')).toBeNull();
  });

  it('returns null without a comment, and finds one after a multi-megabyte data: line quickly', () => {
    expect(findScriptMapComment('a();\n')).toBeNull();
    expect(findScriptMapComment('')).toBeNull();
    const huge = `a();\n//# sourceMappingURL=data:application/json;base64,${'A'.repeat(8_000_000)}\n`;
    const started = performance.now();
    expect(findScriptMapComment(huge)?.length).toBeGreaterThan(8_000_000);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("finding a stylesheet's map comment", () => {
  it('reads the last /*# sourceMappingURL=… */, the value up to */ or a newline', () => {
    expect(findStyleMapComment('a{}\n/*# sourceMappingURL=a.css.map */\n')).toBe('a.css.map');
    expect(findStyleMapComment('a{}\n/*# sourceMappingURL=old.map */\n/*@\tsourceMappingURL=new.map*/')).toBe('new.map');
    expect(findStyleMapComment('a{}\n/*# sourceMappingURL=a.css.map\nb{}')).toBe('a.css.map');
  });

  it('needs one space or tab after the marker, and rejects values with quotes or whitespace', () => {
    expect(findStyleMapComment('a{}/*#sourceMappingURL=a.map*/')).toBeNull();
    expect(findStyleMapComment('a{}/*# sourceMappingURL=a b.map */')).toBeNull();
    expect(findStyleMapComment('a{}/*# sourceMappingURL="a.map" */')).toBeNull();
    expect(findStyleMapComment('a{content:"sourceMappingURL=x.map"}')).toBeNull();
  });
});

describe('picking the reference', () => {
  it('prefers the header for scripts and the comment for stylesheets', () => {
    expect(pickMapReference('Script', 'header.map', 'comment.map')).toEqual({ value: 'header.map', via: 'header' });
    expect(pickMapReference('Stylesheet', 'header.map', 'comment.map')).toEqual({ value: 'comment.map', via: 'comment' });
    expect(pickMapReference('Script', undefined, 'comment.map')).toEqual({ value: 'comment.map', via: 'comment' });
    expect(pickMapReference('Stylesheet', 'header.map', null)).toEqual({ value: 'header.map', via: 'header' });
    expect(pickMapReference('Script', undefined, null)).toBeNull();
  });
});

describe('resolving', () => {
  it('resolves a relative reference against the bundle URL', () => {
    expect(resolveMapUrl('main.js.map', BUNDLE, SOURCE_MAP_LIMITS)).toEqual({ type: 'remote', url: 'https://site.test/static/js/main.js.map' });
    expect(resolveMapUrl('/maps/m.map', BUNDLE, SOURCE_MAP_LIMITS)).toEqual({ type: 'remote', url: 'https://site.test/maps/m.map' });
    expect(resolveMapUrl('https://cdn.test/m.map', BUNDLE, SOURCE_MAP_LIMITS)).toEqual({ type: 'remote', url: 'https://cdn.test/m.map' });
  });

  it('keeps data: references undecoded, and refuses one over the inline cap', () => {
    const data = 'data:application/json;base64,e30=';
    expect(resolveMapUrl(data, BUNDLE, SOURCE_MAP_LIMITS)).toEqual({ type: 'inline', dataUrl: data });
    expect(resolveMapUrl(data, BUNDLE, { ...SOURCE_MAP_LIMITS, maxInlineChars: 10 })).toMatchObject({ type: 'failed', failure: 'too-large' });
  });

  it('refuses file:, javascript:, chrome:, blob: and webpack: before any request, naming the scheme', () => {
    for (const [reference, protocol] of [
      ['file:///etc/passwd', 'file:'],
      ['javascript:alert(1)', 'javascript:'],
      ['chrome://settings', 'chrome:'],
      ['blob:https://site.test/1', 'blob:'],
      ['webpack://app/x.map', 'webpack:'],
    ]) {
      expect(resolveMapUrl(reference!, BUNDLE, SOURCE_MAP_LIMITS)).toEqual({ type: 'failed', failure: 'scheme', detail: protocol });
    }
  });

  it('says an invalid reference is invalid, quoting at most 200 characters', () => {
    const bad = `http://[${'x'.repeat(300)}`;
    const resolved = resolveMapUrl(bad, BUNDLE, SOURCE_MAP_LIMITS);
    expect(resolved).toMatchObject({ type: 'failed', failure: 'bad-url' });
    expect(resolved.type === 'failed' && resolved.detail.length).toBe(200);
  });

  it('sends cookies only to the bundle’s or the page’s origin', () => {
    expect(credentialsFor('https://site.test/m.map', 'https://site.test/a.js', 'about:blank')).toBe('include');
    expect(credentialsFor('https://page.test/m.map', 'https://cdn.test/a.js', 'https://page.test/')).toBe('include');
    expect(credentialsFor('https://evil.test/m.map', 'https://site.test/a.js', 'https://site.test/')).toBe('omit');
    expect(credentialsFor('https://evil.test/m.map', 'https://site.test/a.js', 'not a url')).toBe('omit');
  });
});

describe('loading', () => {
  const MAP = '{"version":3,"sources":[],"mappings":""}';
  const limits: SourceMapLimits = { maxMapBytes: 64, maxInlineChars: 200, maxBundleChars: 100, timeoutMs: 20 };
  type Fetch = SourceMapDeps['fetch'];
  const calls: Array<{ url: string; credentials: string }> = [];
  const deps = (content: Partial<ResourceContent> | Error, fetch: Fetch = async () => new Response(MAP)): SourceMapDeps => ({
    content: async (url) => {
      if (content instanceof Error) throw content;
      return { url, content: 'a();\n//# sourceMappingURL=main.js.map\n', hash: HASH, ...content };
    },
    fetch: async (url, init) => {
      calls.push({ url, credentials: init.credentials });
      return fetch(url, init);
    },
    pageUrl: () => PAGE,
  });
  const request = { bundleUrl: BUNDLE, kind: 'Script' as const };
  /** A body served in 16-byte chunks that counts how often it was cancelled. */
  const streamed = (total: number) => {
    const counter = { cancelled: 0 };
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= total) return controller.close();
        sent += 16;
        controller.enqueue(new Uint8Array(16));
      },
      cancel() {
        counter.cancelled++;
      },
    });
    return { body, counter };
  };

  it('answers none without a header or comment', async () => {
    expect(await loadSourceMap(request, deps({ content: 'a();\n' }), limits)).toEqual({ status: 'none', bundleHash: HASH });
  });

  it('reports an unreadable bundle', async () => {
    expect(await loadSourceMap(request, deps(new Error('gone')), limits)).toEqual({ status: 'failed', failure: 'unreadable', detail: 'gone', mapUrl: null });
  });

  it('returns the very bundle text and hash the reference came from, and the map as bytes', async () => {
    const content = 'a();\n//# sourceMappingURL=main.js.map\n';
    const file = await loadSourceMap(request, deps({ content }), limits);
    expect(file).toMatchObject({ status: 'found', bundleHash: HASH, bundle: content, mapUrl: 'https://site.test/static/js/main.js.map' });
    expect(file.status === 'found' && file.map.type === 'bytes' && new TextDecoder().decode(file.map.bytes)).toBe(MAP);
  });

  it('follows the header over the comment for scripts', async () => {
    const file = await loadSourceMap(request, deps({ sourceMap: '/header.map' }), limits);
    expect(file).toMatchObject({ status: 'found', mapUrl: 'https://site.test/header.map' });
  });

  it('answers unchanged without fetching when the bundle hash and map URL are known', async () => {
    calls.length = 0;
    const known = { bundleHash: HASH, mapUrl: 'https://site.test/static/js/main.js.map' };
    expect(await loadSourceMap({ ...request, known }, deps({}), limits)).toEqual({ status: 'unchanged' });
    expect(calls).toEqual([]);
    // A new build (another hash) or another map is fetched again.
    expect(await loadSourceMap({ ...request, known: { ...known, bundleHash: 'b'.repeat(64) } }, deps({}), limits)).toMatchObject({ status: 'found' });
  });

  it('hands an inline map over without a request', async () => {
    calls.length = 0;
    const content = 'a();\n//# sourceMappingURL=data:application/json;base64,e30=\n';
    expect(await loadSourceMap(request, deps({ content }), limits)).toMatchObject({
      status: 'found',
      mapUrl: null,
      map: { type: 'inline', dataUrl: 'data:application/json;base64,e30=' },
    });
    expect(calls).toEqual([]);
  });

  it('refuses a map a page names on another scheme, before any request', async () => {
    calls.length = 0;
    const content = 'a();\n//# sourceMappingURL=file:///etc/passwd\n';
    expect(await loadSourceMap(request, deps({ content }), limits)).toEqual({ status: 'failed', failure: 'scheme', detail: 'file:', mapUrl: null });
    expect(calls).toEqual([]);
  });

  it("sends cookies only to the bundle's or the page's origin", async () => {
    calls.length = 0;
    await loadSourceMap(request, deps({ content: 'a();\n//# sourceMappingURL=https://cdn.test/m.map\n' }), limits);
    await loadSourceMap(request, deps({ content: 'a();\n//# sourceMappingURL=/m.map\n' }), limits);
    expect(calls.map((c) => c.credentials)).toEqual(['omit', 'include']);
  });

  it('says which HTTP status a missing map answered, and cancels its body', async () => {
    const { body, counter } = streamed(1000);
    const file = await loadSourceMap(request, deps({}, async () => new Response(body, { status: 404 })), limits);
    expect(file).toEqual({ status: 'failed', failure: 'http', detail: '404', mapUrl: 'https://site.test/static/js/main.js.map' });
    expect(counter.cancelled).toBe(1);
  });

  it('stops past the cap, by Content-Length and while streaming, cancelling the download', async () => {
    const byLength = streamed(1000);
    const declared = new Response(byLength.body, { headers: { 'content-length': '1000' } });
    expect(await loadSourceMap(request, deps({}, async () => declared), limits)).toMatchObject({ status: 'failed', failure: 'too-large' });
    expect(byLength.counter.cancelled).toBe(1);

    const undeclared = streamed(1000);
    expect(await loadSourceMap(request, deps({}, async () => new Response(undeclared.body)), limits)).toMatchObject({ status: 'failed', failure: 'too-large' });
    expect(undeclared.counter.cancelled).toBe(1);
  });

  it('times out through the signal it passes', async () => {
    const aborted: Fetch = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
    expect(await loadSourceMap(request, deps({}, aborted), limits)).toMatchObject({ status: 'failed', failure: 'timeout' });
  });

  it('times out even when the transport ignores the signal', async () => {
    const ignoring: Fetch = () => new Promise(() => undefined);
    expect(await loadSourceMap(request, deps({}, ignoring), limits)).toMatchObject({ status: 'failed', failure: 'timeout' });
    // …and while the body is read.
    const stalled = new Response(new ReadableStream({ pull: () => new Promise(() => undefined) }));
    expect(await loadSourceMap(request, deps({}, async () => stalled), limits)).toMatchObject({ status: 'failed', failure: 'timeout' });
  });

  it('reports a network error with its message', async () => {
    const failing: Fetch = async () => {
      throw new TypeError('net::ERR_CONNECTION_REFUSED');
    };
    expect(await loadSourceMap(request, deps({}, failing), limits)).toMatchObject({ status: 'failed', failure: 'network', detail: 'net::ERR_CONNECTION_REFUSED' });
  });

  it('leaves the bundle text out above the alignment cap', async () => {
    const content = `${'x'.repeat(200)}\n//# sourceMappingURL=main.js.map\n`;
    expect(await loadSourceMap(request, deps({ content }), limits)).toMatchObject({ status: 'found', bundle: null });
  });
});
