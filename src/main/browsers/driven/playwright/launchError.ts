import { stripVTControlCharacters } from 'node:util';
import { BROWSER_SAID, INSTALL_DEPS_HINT, LINES_TOLD, MISSING_LIBRARY } from './constants';

/**
 * Why a browser Playwright launched couldn't start, in a line: what it said on its way out (else Playwright's first
 * line), and how to install a system library it misses.
 */
export function launchError(name: string, err: unknown): Error {
  const text = stripVTControlCharacters(err instanceof Error ? err.message : String(err));
  const said = text.split('\n').flatMap((line) => BROWSER_SAID.exec(line.trim())?.slice(1) ?? []).slice(0, LINES_TOLD);
  const why = (said.length ? said : text.split('\n').slice(0, 1)).join(' · ');
  return new Error(`${name} couldn't start: ${why}${why.includes(MISSING_LIBRARY) ? ` (${INSTALL_DEPS_HINT})` : ''}`);
}
