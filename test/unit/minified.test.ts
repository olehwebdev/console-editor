import { describe, expect, it } from 'vitest';
import { looksMinified } from '../../src/shared/minified';
import { APP_JS, MAIN_JS, STYLE_CSS } from '../fixtures/site';

describe('looksMinified', () => {
  it('detects a minified bundle', () => {
    expect(looksMinified(MAIN_JS)).toBe(true);
  });

  it('ignores hand-written code and tiny files', () => {
    expect(looksMinified(APP_JS)).toBe(false);
    expect(looksMinified(STYLE_CSS)).toBe(false);
    const normal = Array.from({ length: 200 }, (_, i) => `  const value${i} = compute(${i}); // step ${i}`).join('\n');
    expect(looksMinified(normal)).toBe(false);
  });

  it('flags a single huge line inside otherwise normal code', () => {
    const text = `const a = 1;\nconst data = "${'x'.repeat(2000)}";\nconst b = 2;\n`;
    expect(looksMinified(text)).toBe(true);
  });

  it('flags minified CSS', () => {
    const css = Array.from({ length: 40 }, (_, i) => `.c${i}{margin:${i}px;padding:0 ${i}px;color:#${(i * 99999).toString(16).slice(0, 6)}}`).join('');
    expect(looksMinified(css)).toBe(true);
  });
});
