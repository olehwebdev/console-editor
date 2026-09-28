import { LOCAL_NETWORK_ACCESS_FEATURES } from '../../../chromiumFlags';
import type { FoundBrowser } from '../../types';
import { launchDriven } from '../launchDriven';
import { ACTIVE_PORT_FILE, DISABLE_FEATURES_FLAG, DRIVE_FLAGS, USER_DATA_FLAG } from './constants';
import { readActivePort } from './readActivePort';

/** Starts a Chromium browser to be driven: its profile in `dir`, a debugging port, the app's Chromium switches. */
export function launchChromium(browser: FoundBrowser, dir: string): Promise<string> {
  const flags = [`${USER_DATA_FLAG}${dir}`, ...DRIVE_FLAGS, `${DISABLE_FEATURES_FLAG}${LOCAL_NETWORK_ACCESS_FEATURES.join(',')}`];
  return launchDriven(browser, dir, { flags, portFile: ACTIVE_PORT_FILE, read: readActivePort });
}
