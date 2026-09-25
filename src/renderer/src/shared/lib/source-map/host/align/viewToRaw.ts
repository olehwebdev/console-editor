import type { Alignment } from '../types';
import { EDITED } from './constants';
import { lowerBound } from './lowerBound';
import { translateIndex } from './translateIndex';

const NEWLINE = '\n';

/**
 * The raw bundle offset of a tab position, or null inside the edited middle (code with no original).
 * A position on whitespace takes the next token on its line (a cursor in indentation), else the one
 * before (a cursor past a line's end).
 */
export function viewToRaw(rawCode: Uint32Array, alignment: Alignment, viewOffset: number): number | null {
  const { code, prefix, suffix, text } = alignment;
  if (code.length === 0 || rawCode.length === 0) return null;
  let index = lowerBound(code, viewOffset);
  if (index === code.length || code[index] !== viewOffset) {
    const nextOnLine = index < code.length && !text.slice(viewOffset, code[index]).includes(NEWLINE);
    if (!nextOnLine) index = Math.max(0, index - 1);
  }
  const raw = translateIndex(index, code.length, rawCode.length, prefix, suffix);
  return raw === EDITED ? null : rawCode[raw]!;
}
