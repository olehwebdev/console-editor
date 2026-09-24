import { escapeRegExp } from './escapeRegExp';
import type { TextRange } from './types';

/** Every case-insensitive occurrence of `needle` in `text`. */
export function findMatches(text: string, needle: string | undefined): TextRange[] {
  const query = needle?.trim();
  if (!query) return [];
  const out: TextRange[] = [];
  // A case-insensitive regex keeps indices on the original string (lower-casing can change lengths).
  const pattern = new RegExp(escapeRegExp(query), 'gi');
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    out.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) pattern.lastIndex++;
  }
  return out;
}
