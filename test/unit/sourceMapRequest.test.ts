import { describe, expect, it } from 'vitest';
import { assertSourceMapRequest } from '../../src/main/ipc/assertSourceMapRequest';

const HASH = '0123456789abcdef'.repeat(4);

describe('source-map requests from the renderer', () => {
  it('accepts a well-formed request', () => {
    expect(() => assertSourceMapRequest({ bundleUrl: 'https://a.test/main.js', kind: 'Script' })).not.toThrow();
    expect(() => assertSourceMapRequest({ bundleUrl: 'http://a.test/a.css', kind: 'Stylesheet', known: { bundleHash: HASH, mapUrl: null } })).not.toThrow();
    expect(() =>
      assertSourceMapRequest({ bundleUrl: 'https://a.test/main.js', kind: 'Script', known: { bundleHash: HASH, mapUrl: 'https://a.test/main.js.map' } }),
    ).not.toThrow();
  });

  it('rejects non-objects, non-http(s) and over-long bundle URLs, the Document kind, and malformed known values', () => {
    for (const bad of [
      null,
      'https://a.test/main.js',
      { kind: 'Script' },
      { bundleUrl: 'file:///etc/passwd', kind: 'Script' },
      { bundleUrl: 'webpack://app/main.js', kind: 'Script' },
      { bundleUrl: `https://a.test/${'x'.repeat(9000)}`, kind: 'Script' },
      { bundleUrl: 'https://a.test/', kind: 'Document' },
      { bundleUrl: 'https://a.test/main.js', kind: 'Script', known: null },
      { bundleUrl: 'https://a.test/main.js', kind: 'Script', known: { bundleHash: 'nope', mapUrl: null } },
      { bundleUrl: 'https://a.test/main.js', kind: 'Script', known: { bundleHash: HASH, mapUrl: 42 } },
      { bundleUrl: 'https://a.test/main.js', kind: 'Script', known: { bundleHash: HASH } },
    ]) {
      expect(() => assertSourceMapRequest(bad), JSON.stringify(bad)?.slice(0, 80)).toThrow();
    }
  });
});
