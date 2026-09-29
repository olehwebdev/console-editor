import { BROWSER_ENGINES, type BrowserEngine } from '../../../shared/types';
import { isRecord } from '../isRecord';
import { ADDED_BROWSER_ID, BROWSERS_FILE_VERSION, MAX_ADDED_BROWSERS, MAX_BROWSER_TEXT, MAX_HIDDEN_BROWSERS } from './constants';
import type { AddedBrowser, BrowserPrefs } from './types';

/** The well-formed parts of a browsers file: a file of another version, or anything malformed, counts as none. */
export function sanitizeBrowserPrefs(input: unknown): BrowserPrefs {
  if (!isRecord(input) || input.version !== BROWSERS_FILE_VERSION) return { added: [], hidden: [] };
  const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= MAX_BROWSER_TEXT;
  const added = (Array.isArray(input.added) ? input.added : [])
    .filter(
      (b): b is AddedBrowser =>
        isRecord(b) && text(b.id) && ADDED_BROWSER_ID.test(b.id) && text(b.name) && text(b.path) && BROWSER_ENGINES.includes(b.engine as BrowserEngine),
    )
    .slice(0, MAX_ADDED_BROWSERS)
    .map(({ id, name, path, engine }) => ({ id, name, path, engine }));
  const hidden = [...new Set((Array.isArray(input.hidden) ? input.hidden : []).filter(text))].slice(0, MAX_HIDDEN_BROWSERS);
  return { added, hidden };
}
