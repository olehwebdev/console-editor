import { CdpConnection } from '../../engine/websocketTransport';
import type { FoundBrowser } from '../types';
import { launchForDriving } from './launchForDriving';
import { readActivePort } from './readActivePort';

/**
 * A connection to the browser driven with the profile in `dir`: the one the app launched before, if it is still open
 * (the app was restarted, or stopped driving it), else one launched now. A browser already open with that profile
 * would take a second launch's address itself, and never open a debugging port for it.
 */
export async function reachOrLaunch(browser: FoundBrowser, dir: string): Promise<CdpConnection> {
  const running = await readActivePort(dir);
  const reached = running ? await CdpConnection.connect(running).catch(() => null) : null;
  return reached ?? CdpConnection.connect(await launchForDriving(browser, dir));
}
