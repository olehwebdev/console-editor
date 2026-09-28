import { DRIVEN_ENGINES, type BrowserInfo } from '@common/types';

/** The engines the app drives, to look one up. */
const DRIVEN: ReadonlySet<string> = new Set(DRIVEN_ENGINES);

/** Whether a browser can be opened with the workspace's changes (its engine is one the app drives). */
export function canDrive(browser: Pick<BrowserInfo, 'engine'>): boolean {
  return DRIVEN.has(browser.engine);
}
