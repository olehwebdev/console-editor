import { BIDI, BidiConnection } from '../../../engine/bidi';
import type { FoundBrowser } from '../../types';
import { profileDir } from '../profileDir';
import { reachOrLaunch } from '../reachOrLaunch';
import type { Driver, DriverDeps } from '../types';
import { DrivenFirefox } from './DrivenFirefox';
import { launchFirefox } from './launchFirefox';
import { readBidiPort } from './readBidiPort';

/** Drives Firefox over WebDriver BiDi: the one still open with the app's profile for it, or one launched now. */
export async function connectFirefox(browser: FoundBrowser, deps: DriverDeps): Promise<Driver> {
  const dir = profileDir(browser, deps.userData);
  const connection = await reachOrLaunch(() => readBidiPort(dir), (address) => BidiConnection.open(address), () => launchFirefox(browser, dir));
  const { capabilities } = await connection.send<{ capabilities: { browserVersion?: string } }>(BIDI.session.new, { capabilities: {} });
  const driver = new DrivenFirefox(browser, capabilities.browserVersion ?? null, connection, deps);
  await driver.start();
  return driver;
}
