import type { BrowserInfo } from '@common/types';
import { matchesWords } from '@/shared/lib';

/** Whether a browser answers the menu's search: every word in its name, engine or version. */
export function matchesBrowser(browser: BrowserInfo, query: string): boolean {
  return matchesWords(`${browser.name} ${browser.engine} ${browser.version ?? ''}`, query);
}
