import type { DrivenEngine } from '../../../shared/types';
import type { FoundBrowser } from '../types';
import { WEBKIT_ID } from '../webkit/constants';
import { connectChromium } from './chromium/connectChromium';
import { connectEverydayChrome } from './everyday/connectEverydayChrome';
import { connectFirefox } from './firefox/connectFirefox';
import { connectWebKit } from './playwright';
import type { ConnectDriver } from './types';

/** How a browser of each engine is driven (the UI offers what `DRIVEN_ENGINES` lists); another can't be served the workspace's changes. */
const DRIVERS: Readonly<Record<DrivenEngine, ConnectDriver>> = { chromium: connectChromium, gecko: connectFirefox };

/**
 * How a browser is driven with the workspace's changes: by its engine, the WebKit build the app downloads through
 * Playwright, or your everyday Chromium browser (`everyday`) as it runs; none for another (Safari).
 */
export function connectorOf(browser: FoundBrowser, everyday: boolean): ConnectDriver | undefined {
  if (everyday) return browser.engine === 'chromium' ? connectEverydayChrome : undefined;
  if (browser.id === WEBKIT_ID) return connectWebKit;
  return Object.hasOwn(DRIVERS, browser.engine) ? DRIVERS[browser.engine as DrivenEngine] : undefined;
}
