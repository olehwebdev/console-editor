import type { BrowserInfo } from '../../../shared/types';
import type { FoundBrowser } from '../types';

/** What the UI is told of a browser: never its command or paths. */
export function infoOf(browser: FoundBrowser, icon: string | null | undefined, version: string | null | undefined, hidden: ReadonlySet<string>): BrowserInfo {
  return { id: browser.id, name: browser.name, engine: browser.engine, version: version ?? null, icon: icon ?? null, added: browser.added, hidden: hidden.has(browser.id) };
}
