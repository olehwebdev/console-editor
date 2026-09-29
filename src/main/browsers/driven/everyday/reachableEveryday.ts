import type { FoundBrowser } from '../../types';
import { readActivePort } from '../chromium/readActivePort';
import { everydayProfileDir } from './everydayProfileDir';
import { isListening } from './isListening';

/**
 * The debugging address of a Chromium browser's everyday profile, while remote debugging is on for it and it runs
 * (its port takes connections); null otherwise.
 */
export async function reachableEveryday(browser: FoundBrowser, home: string, platform: NodeJS.Platform = process.platform): Promise<string | null> {
  const dir = browser.engine === 'chromium' ? everydayProfileDir(browser, home, platform) : null;
  const address = dir ? await readActivePort(dir) : null;
  const port = address ? Number(new URL(address).port) : 0;
  return port && (await isListening(port)) ? address : null;
}
