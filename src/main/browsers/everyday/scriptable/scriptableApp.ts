import { basename } from 'node:path';
import type { FoundBrowser } from '../../types';
import { APP_BUNDLE, SCRIPTABLE_APPS } from './constants';

/** The app name scripting knows a macOS browser by, when it is one whose tabs it reaches; null otherwise. */
export function scriptableApp(browser: FoundBrowser): string | null {
  if (!browser.app?.endsWith(APP_BUNDLE)) return null;
  const name = basename(browser.app, APP_BUNDLE);
  return Object.hasOwn(SCRIPTABLE_APPS, name) ? name : null;
}
