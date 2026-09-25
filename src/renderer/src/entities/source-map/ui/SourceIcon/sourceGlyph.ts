import { EXTENSION, LANG_HINT, OTHER_SOURCE_GLYPH, SOURCE_GLYPHS, type SourceGlyph } from './constants';

/** The glyph and tint of an original, from its file name (which may carry a query). */
export function sourceGlyph(file: string): SourceGlyph {
  const query = file.indexOf('?');
  const name = query === -1 ? file : file.slice(0, query);
  const extension = ((query === -1 ? null : LANG_HINT.exec(file.slice(query))?.[1]) ?? EXTENSION.exec(name)?.[1] ?? '').toLowerCase();
  return Object.hasOwn(SOURCE_GLYPHS, extension) ? SOURCE_GLYPHS[extension]! : OTHER_SOURCE_GLYPH;
}
