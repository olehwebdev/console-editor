import type { BrowserInfo } from '@common/types';

/** Whether a browser answers the menu's search: every word in its name, engine or version. */
export function matchesBrowser(browser: BrowserInfo, query: string): boolean {
  const text = `${browser.name} ${browser.engine} ${browser.version ?? ''}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
