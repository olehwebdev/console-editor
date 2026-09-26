import { describe, expect, it } from 'vitest';
import {
  compileMatcher,
  defaultMatcherFor,
  sameMatcher,
  stripQuery,
  suggestHashGlob,
  toCdpUrlPattern,
  urlMatcherSchema,
} from '../../src/shared/matcher';
import { firstIssue } from '../../src/shared/validation';

describe('a match type this build does not know', () => {
  // A newer version's type, or a hand edit of overrides.json, must not take down interception.
  const unknown = { type: 'prefix', pattern: 'https://a.com/', ignoreQuery: false } as unknown as Parameters<typeof compileMatcher>[0];

  it('compiles to a matcher that matches nothing', () => {
    expect(compileMatcher(unknown)('https://a.com/app.js')).toBe(false);
  });

  it('pauses broadly, as a regex does, and leaves the decision to the matcher', () => {
    expect(toCdpUrlPattern(unknown)).toBe('*');
  });

  it('is not mistaken for an Object.prototype member', () => {
    const inherited = { ...unknown, type: 'toString' } as unknown as typeof unknown;
    expect(compileMatcher(inherited)('https://a.com/')).toBe(false);
    expect(toCdpUrlPattern(inherited)).toBe('*');
  });
});

describe('sameMatcher', () => {
  it('compares type, pattern and ignoreQuery', () => {
    const a = { type: 'glob' as const, pattern: 'https://a.com/*.js', ignoreQuery: true };
    expect(sameMatcher(a, { ...a })).toBe(true);
    expect(sameMatcher(a, { ...a, type: 'regex' })).toBe(false);
    expect(sameMatcher(a, { ...a, pattern: 'https://a.com/*' })).toBe(false);
    expect(sameMatcher(a, { ...a, ignoreQuery: false })).toBe(false);
  });
});

describe('stripQuery', () => {
  it('removes query and fragment', () => {
    expect(stripQuery('https://a.com/x.js?v=1#h')).toBe('https://a.com/x.js');
    expect(stripQuery('https://a.com/x.js')).toBe('https://a.com/x.js');
  });
});

describe('compileMatcher', () => {
  it('exact, ignoring the query string', () => {
    const m = compileMatcher({ type: 'exact', pattern: 'https://a.com/app.js', ignoreQuery: true });
    expect(m('https://a.com/app.js')).toBe(true);
    expect(m('https://a.com/app.js?v=123')).toBe(true);
    expect(m('https://a.com/app.js.map')).toBe(false);
    expect(m('https://b.com/app.js')).toBe(false);
  });

  it('exact, including the query string', () => {
    const m = compileMatcher({ type: 'exact', pattern: 'https://a.com/app.js?v=1', ignoreQuery: false });
    expect(m('https://a.com/app.js?v=1')).toBe(true);
    expect(m('https://a.com/app.js?v=2')).toBe(false);
  });

  it('glob treats only * as a wildcard', () => {
    const m = compileMatcher({ type: 'glob', pattern: 'https://cdn.a.com/js/main.*.js', ignoreQuery: true });
    expect(m('https://cdn.a.com/js/main.3f9a1c2b.js')).toBe(true);
    expect(m('https://cdn.a.com/js/main.3f9a1c2b.js?x=1')).toBe(true);
    expect(m('https://cdn.a.com/js/mainX3f9a1c2bXjs')).toBe(false); // dots are literal
    expect(m('https://cdn.a.com/js/vendor.3f9a1c2b.js')).toBe(false);
  });

  it('regex', () => {
    const m = compileMatcher({ type: 'regex', pattern: '/chunks/\\d+\\.js$', ignoreQuery: false });
    expect(m('https://a.com/chunks/42.js')).toBe(true);
    expect(m('https://a.com/chunks/a.js')).toBe(false);
  });

  it('an invalid regex matches nothing instead of throwing', () => {
    const m = compileMatcher({ type: 'regex', pattern: '([', ignoreQuery: false });
    expect(m('https://a.com/')).toBe(false);
  });
});

describe('urlMatcherSchema', () => {
  it('rejects empty patterns and bad regexes', () => {
    expect(firstIssue(urlMatcherSchema, { type: 'exact', pattern: ' ', ignoreQuery: true })).toMatch(/empty/);
    expect(firstIssue(urlMatcherSchema, { type: 'regex', pattern: '([', ignoreQuery: true })).toMatch(/Invalid regular expression/);
    expect(firstIssue(urlMatcherSchema, { type: 'glob', pattern: 'https://a.com/*.js', ignoreQuery: true })).toBeNull();
  });
});

describe('toCdpUrlPattern', () => {
  it('escapes CDP wildcards in literal parts', () => {
    expect(toCdpUrlPattern({ type: 'exact', pattern: 'https://a.com/x.js?v=1', ignoreQuery: false })).toBe(
      'https://a.com/x.js\\?v=1',
    );
  });

  it('adds a trailing wildcard when ignoring the query', () => {
    expect(toCdpUrlPattern(defaultMatcherFor('https://a.com/x.js?v=1'))).toBe('https://a.com/x.js*');
  });

  it('keeps glob wildcards', () => {
    expect(toCdpUrlPattern({ type: 'glob', pattern: 'https://a.com/main.*.js', ignoreQuery: false })).toBe(
      'https://a.com/main.*.js',
    );
  });

  it('uses * for regexes', () => {
    expect(toCdpUrlPattern({ type: 'regex', pattern: 'x', ignoreQuery: false })).toBe('*');
  });
});

describe('suggestHashGlob', () => {
  it.each([
    ['https://a.com/static/js/main.3f9a1c2b.js', 'https://a.com/static/js/main.*.js'],
    ['https://a.com/static/js/2.a1b2c3d4.chunk.js?x=1', 'https://a.com/static/js/2.*.chunk.js'],
    ['https://a.com/assets/index-BkT3x9aQ.js', 'https://a.com/assets/index-*.js'],
    ['https://a.com/assets/style.4e5f6a7b8c.css', 'https://a.com/assets/style.*.css'],
  ])('%s -> %s', (url, glob) => {
    expect(suggestHashGlob(url)).toBe(glob);
  });

  it.each(['https://a.com/app.js', 'https://a.com/jquery-3.6.0.min.js', 'https://a.com/app.min.js'])(
    'returns null for %s',
    (url) => {
      expect(suggestHashGlob(url)).toBeNull();
    },
  );
});
