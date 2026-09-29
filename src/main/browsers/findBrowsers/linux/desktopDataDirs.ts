import { homedir } from 'node:os';
import { join } from 'node:path';
import { xdgDataDirs } from '../../../desktopEntry/xdgDataDirs';
import { xdgDataHome } from '../../../desktopEntry/xdgDataHome';
import { PACKAGED_DATA_DIRS, USER_FLATPAK_DATA_DIR } from './constants';

/** The data folders launchers and icons are in, most important first: the user's, the system's, then Flatpak's and Snap's. */
export function desktopDataDirs(): string[] {
  return [...new Set([xdgDataHome(), join(homedir(), USER_FLATPAK_DATA_DIR), ...xdgDataDirs(), ...PACKAGED_DATA_DIRS])];
}
