import type { FoundBrowser } from '../types';
import { SCRIPTING_PLATFORM, scriptableApp } from './scriptable';

/** Whether a browser's everyday tabs can be listed: Firefox's from its session file, and on macOS those scripting reaches. */
export function listsTabs(browser: FoundBrowser, platform: NodeJS.Platform = process.platform): boolean {
  return browser.engine === 'gecko' || (platform === SCRIPTING_PLATFORM && scriptableApp(browser) !== null);
}
