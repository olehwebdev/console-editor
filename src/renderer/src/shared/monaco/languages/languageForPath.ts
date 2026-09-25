import { LANG_QUERY_HINT, LARGE_FILE_CHARS, LITE_TWIN, PLAIN_TEXT, SOURCE_LANGUAGES, type SourceLanguage } from './constants';

const QUERY_OR_HASH = /[?#]/;
const DOT = '.';

/**
 * The language an original source opens in, from its file name (a query's `lang` hint wins). At the
 * large-file size it opens highlight-only, like a bundle, or as plain text.
 */
export function languageForPath(fileName: string, length: number): SourceLanguage & { lite: boolean } {
  const hint = LANG_QUERY_HINT.exec(fileName)?.[1];
  const path = fileName.split(QUERY_OR_HASH)[0]!;
  const extension = (hint ? DOT + hint : path.slice(path.lastIndexOf(DOT))).toLowerCase();
  const language = SOURCE_LANGUAGES[extension] ?? PLAIN_TEXT;
  if (length < LARGE_FILE_CHARS) return { ...language, lite: false };
  return { id: LITE_TWIN[language.id] ?? PLAIN_TEXT.id, name: language.name, lite: true };
}
