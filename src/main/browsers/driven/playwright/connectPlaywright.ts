import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { FoundBrowser } from '../../types';
import { profileDir } from '../profileDir';
import type { Driver, DriverDeps } from '../types';
import { STATE_FILE } from './constants';
import { DrivenPlaywright } from './DrivenPlaywright';
import { launchError } from './launchError';
import type { PlaywrightLaunch } from './types';

/**
 * Launches a browser through Playwright with the cookies and storage it kept last time (in its profile folder), in a
 * window at its own size, and starts driving it.
 */
export async function connectPlaywright({ type, executablePath, headless }: PlaywrightLaunch, browser: FoundBrowser, deps: DriverDeps): Promise<Driver> {
  const dir = profileDir(browser, deps.userData);
  await mkdir(dir, { recursive: true });
  const stateFile = join(dir, STATE_FILE);
  const launched = await type.launch({ executablePath, headless }).catch((err: unknown) => {
    throw launchError(browser.name, err);
  });
  const kept = await access(stateFile).then(
    () => stateFile,
    () => undefined,
  );
  // A state file that can't be read is left for a fresh one.
  const context = await launched.newContext({ viewport: null, storageState: kept }).catch(() => launched.newContext({ viewport: null }));
  const driver = new DrivenPlaywright(browser, { browser: launched, context, stateFile }, deps);
  await driver.start();
  return driver;
}
