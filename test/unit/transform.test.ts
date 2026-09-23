import { describe, expect, it } from 'vitest';
import {
  buildOverrideHeaders,
  buildRewrittenHeaders,
  charsetOf,
  decodeBody,
  isRedirect,
  stripIntegrityAttributes,
  stripSourceMapComments,
} from '../../src/main/engine/transform';

describe('stripIntegrityAttributes', () => {
  it('removes integrity from script and link tags only', () => {
    const html = [
      '<script src="/a.js" integrity="sha384-abc" crossorigin="anonymous"></script>',
      "<link rel=stylesheet href='/a.css' integrity='sha256-xyz'>",
      '<link rel="modulepreload" href="/m.js" integrity=sha384-unquoted>',
      '<img src="/x.png" integrity="keep-me">',
      '<script>var s = "integrity=\\"nope\\"";</script>',
    ].join('\n');
    const { html: out, count } = stripIntegrityAttributes(html);
    expect(count).toBe(3);
    expect(out).toContain('<script src="/a.js" crossorigin="anonymous"></script>');
    expect(out).toContain("<link rel=stylesheet href='/a.css'>");
    expect(out).toContain('<link rel="modulepreload" href="/m.js">');
    expect(out).toContain('<img src="/x.png" integrity="keep-me">');
    expect(out).toContain('var s = "integrity=\\"nope\\"";');
  });

  it('handles > inside quoted attribute values', () => {
    const { html, count } = stripIntegrityAttributes('<script data-x="a>b" integrity="sha384-1" src="/a.js"></script>');
    expect(count).toBe(1);
    expect(html).toBe('<script data-x="a>b" src="/a.js"></script>');
  });
});

describe('stripSourceMapComments', () => {
  it('removes JS and CSS style comments', () => {
    const code = 'a();\n//# sourceMappingURL=a.js.map\nb();\n/*# sourceMappingURL=a.css.map */\n//@ sourceMappingURL=old.map';
    expect(stripSourceMapComments(code)).toBe('a();\n\nb();\n\n');
  });

  it('leaves unrelated comments alone', () => {
    expect(stripSourceMapComments('// hello\nx();')).toBe('// hello\nx();');
  });
});

describe('buildOverrideHeaders', () => {
  const upstream = [
    { name: 'Content-Type', value: 'application/javascript; charset=iso-8859-1' },
    { name: 'Content-Encoding', value: 'gzip' },
    { name: 'Content-Length', value: '123' },
    { name: 'ETag', value: '"abc"' },
    { name: 'Cache-Control', value: 'max-age=31536000' },
    { name: 'SourceMap', value: 'a.js.map' },
    { name: 'Access-Control-Allow-Origin', value: '*' },
    { name: 'Set-Cookie', value: 'a=1' },
    { name: 'Set-Cookie', value: 'b=2' },
  ];

  it('drops body-specific headers, keeps the rest, forces utf-8 and no-store', () => {
    const headers = buildOverrideHeaders(upstream, 'Script', { stripSourceMaps: true });
    const names = headers.map((h) => h.name.toLowerCase());
    expect(names).not.toContain('content-encoding');
    expect(names).not.toContain('content-length');
    expect(names).not.toContain('etag');
    expect(names).not.toContain('sourcemap');
    expect(headers.filter((h) => h.name === 'Set-Cookie')).toHaveLength(2);
    expect(headers).toContainEqual({ name: 'Access-Control-Allow-Origin', value: '*' });
    expect(headers).toContainEqual({ name: 'Content-Type', value: 'application/javascript; charset=utf-8' });
    expect(headers).toContainEqual({ name: 'Cache-Control', value: 'no-store' });
  });

  it('keeps SourceMap when not stripping, and defaults the content type', () => {
    const headers = buildOverrideHeaders([{ name: 'SourceMap', value: 'x' }], 'Stylesheet', { stripSourceMaps: false });
    expect(headers).toContainEqual({ name: 'SourceMap', value: 'x' });
    expect(headers).toContainEqual({ name: 'Content-Type', value: 'text/css; charset=utf-8' });
  });
});

describe('buildRewrittenHeaders', () => {
  it('keeps caching headers but drops encoding/length', () => {
    const headers = buildRewrittenHeaders(
      [
        { name: 'content-encoding', value: 'br' },
        { name: 'cache-control', value: 'no-cache' },
      ],
      'text/html',
    );
    expect(headers).toEqual([
      { name: 'cache-control', value: 'no-cache' },
      { name: 'Content-Type', value: 'text/html; charset=utf-8' },
    ]);
  });
});

describe('decodeBody', () => {
  it('passes plain text through', () => {
    expect(decodeBody('héllo', false)).toBe('héllo');
  });

  it('decodes base64 as utf-8 by default', () => {
    expect(decodeBody(Buffer.from('héllo', 'utf8').toString('base64'), true)).toBe('héllo');
  });

  it('honours the charset of the content type', () => {
    const latin1 = Buffer.from([0x68, 0xe9, 0x6c, 0x6c, 0x6f]).toString('base64');
    expect(decodeBody(latin1, true, 'text/javascript; charset=ISO-8859-1')).toBe('héllo');
  });

  it('falls back to utf-8 for unknown charsets', () => {
    expect(decodeBody(Buffer.from('ok').toString('base64'), true, 'text/css; charset=bogus')).toBe('ok');
    expect(charsetOf('text/css; charset="UTF-8"')).toBe('utf-8');
  });
});

describe('isRedirect', () => {
  it('needs a 3xx status and a Location header', () => {
    expect(isRedirect(302, [{ name: 'Location', value: '/x' }])).toBe(true);
    expect(isRedirect(304, [])).toBe(false);
    expect(isRedirect(200, [{ name: 'Location', value: '/x' }])).toBe(false);
  });
});
