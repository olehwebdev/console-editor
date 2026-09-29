import { CDP } from '../../../engine/constants';
import { withTimeout } from '../../../engine/PageInterception';
import { CdpConnection } from '../../../engine/websocketTransport';
import type { FoundBrowser } from '../../types';
import { PRODUCT_VERSION } from '../chromium/constants';
import { DrivenEverydayChrome } from '../chromium/DrivenEverydayChrome';
import type { Driver, DriverDeps } from '../types';
import { ALLOW_TIMEOUT_MS } from './constants';
import { reachableEveryday } from './reachableEveryday';

/**
 * Drives your everyday Chromium browser with the workspace's changes, over the debugging port turned on for it
 * (chrome://inspect/#remote-debugging): the browser asks you to allow the connection first.
 */
export async function connectEverydayChrome(browser: FoundBrowser, deps: DriverDeps): Promise<Driver> {
  const address = await reachableEveryday(browser, deps.home);
  if (!address) throw new Error(`Turn on remote debugging in ${browser.name} first: chrome://inspect/#remote-debugging`);
  const reached = (async () => {
    const connection = await CdpConnection.connect(address);
    const { product } = await connection.send<{ product: string }>(CDP.Browser.getVersion);
    return { connection, version: PRODUCT_VERSION.exec(product)?.[1] ?? null };
  })();
  const { connection, version } = await withTimeout(reached, ALLOW_TIMEOUT_MS, `Waiting for ${browser.name} to allow the connection`);
  const driver = new DrivenEverydayChrome(browser, version, connection, deps);
  await driver.start();
  return driver;
}
