import type { FoundBrowser } from '../types';
import { findLinuxBrowsers } from './linux/findLinuxBrowsers';
import { findMacBrowsers } from './mac/findMacBrowsers';
import { findWindowsBrowsers } from './windows/findWindowsBrowsers';

/** How each system lists its installed browsers; other systems have none the app knows how to find. */
const FINDERS: Partial<Record<NodeJS.Platform, () => Promise<FoundBrowser[]>>> = {
  linux: findLinuxBrowsers,
  darwin: findMacBrowsers,
  win32: findWindowsBrowsers,
};

/** The browsers installed on this computer. */
export function findBrowsers(): Promise<FoundBrowser[]> {
  return FINDERS[process.platform]?.() ?? Promise.resolve([]);
}
