import { DESKTOP_ENTRY } from './constants';

/** The spec's general escapes; others are kept as written (Exec has quoting rules of its own on top). */
const ESCAPES: Record<string, string> = { s: ' ', n: '\n', t: '\t', r: '\r', '\\': '\\' };
const ESCAPE = /\\([sntr\\])/g;

/** A desktop entry's own keys (its `[Desktop Entry]` group), without localized ones (`Name[de]`), values unescaped of `\s \n \t \r \\`. */
export function parseDesktopEntry(text: string): Record<string, string> {
  const keys: Record<string, string> = {};
  let inGroup = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[')) {
      inGroup = line === DESKTOP_ENTRY.group;
      continue;
    }
    const eq = line.indexOf('=');
    if (!inGroup || eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (key.includes('[') || Object.hasOwn(keys, key)) continue;
    keys[key] = line
      .slice(eq + 1)
      .trim()
      .replace(ESCAPE, (_, c: string) => ESCAPES[c]);
  }
  return keys;
}
