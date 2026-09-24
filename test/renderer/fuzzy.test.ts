import { describe, expect, it } from 'vitest';
import { fuzzyMatch, normalizeQuery } from '@/shared/ui/command-palette';

const match = (query: string, text: string) => fuzzyMatch(normalizeQuery(query), text);
const picked = (query: string, text: string) => match(query, text)?.indices.map((i) => text[i]).join('');

describe('command palette fuzzy matching', () => {
  it('ranks a contiguous match above a scattered one, and a word start above mid-word', () => {
    const contiguous = match('app', 'app.js')!.score;
    const midWord = match('app', 'wrapper.js')!.score;
    const scattered = match('ajs', 'app.js')!.score;
    expect(contiguous).toBeGreaterThan(midWord);
    expect(midWord).toBeGreaterThan(scattered);
  });

  it('prefers word starts for scattered letters', () => {
    expect(match('mjs', 'static/js/main.1a2b.js')!.indices).toEqual([10, 20, 21]);
  });

  it('lets a query run across spaces', () => {
    expect(picked('saveov', 'Save override')).toBe('Saveov');
  });

  it('returns null when the letters are not all there, in order', () => {
    expect(match('xyz', 'app.js')).toBeNull();
    expect(match('sj', 'js')).toBeNull();
  });

  // 'İ'.toLowerCase() is two characters long; indices must still point into the original text.
  it.each([
    ['ljs', 'İletişim.js', 'ljs'],
    ['ijs', 'İletişim.js', 'İjs'],
    ['js', 'İletişim.js', 'js'],
    ['il', 'İletişim.js', 'İl'],
    ['İl', 'İletişim.js', 'İl'],
  ])('keeps positions right with length-changing lower case (%s in %s)', (query, text, expected) => {
    expect(() => match(query, text)).not.toThrow();
    expect(picked(query, text)).toBe(expected);
    for (const i of match(query, text)!.indices) expect(i).toBeLessThan(text.length);
  });
});
