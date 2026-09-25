import { isAlignWhitespace } from './isAlignWhitespace';

/** The offsets of a text's non-whitespace characters, in order. */
export function codeOffsets(text: string): Uint32Array {
  const offsets = new Uint32Array(text.length);
  let count = 0;
  for (let i = 0; i < text.length; i++) if (!isAlignWhitespace(text.charCodeAt(i))) offsets[count++] = i;
  return offsets.slice(0, count);
}
