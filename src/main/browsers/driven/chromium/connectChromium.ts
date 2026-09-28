import { CDP } from '../../../engine/constants';
import { CdpConnection } from '../../../engine/websocketTransport';
import type { FoundBrowser } from '../../types';
import { profileDir } from '../profileDir';
import { reachOrLaunch } from '../reachOrLaunch';
import type { Driver, DriverDeps } from '../types';
import { PRODUCT_VERSION } from './constants';
import { DrivenChromium } from './DrivenChromium';
import { launchChromium } from './launchChromium';
import { readActivePort } from './readActivePort';

/** Drives a Chromium browser over CDP: the one still open with the app's profile for it, or one launched now. */
export async function connectChromium(browser: FoundBrowser, deps: DriverDeps): Promise<Driver> {
  const dir = profileDir(browser, deps.userData);
  const connection = await reachOrLaunch(() => readActivePort(dir), (address) => CdpConnection.connect(address), () => launchChromium(browser, dir));
  const { product } = await connection.send<{ product: string }>(CDP.Browser.getVersion);
  const driver = new DrivenChromium(browser, PRODUCT_VERSION.exec(product)?.[1] ?? null, connection, deps);
  await driver.start();
  return driver;
}
