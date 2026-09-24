import { AppImageUpdater, NsisUpdater, RpmUpdater } from 'electron-updater';
import { DebInstaller } from './DebInstaller';
import type { InstallMethod, InstallMethodUpdater } from './types';

/**
 * electron-updater for each install method, and whether quitting after a download installs it too: where
 * that needs no password (not a .deb or .rpm, which ask for one).
 */
export const INSTALL_METHOD_UPDATERS: Record<InstallMethod, InstallMethodUpdater> = {
  nsis: { create: () => new NsisUpdater(), installsOnQuit: true },
  appimage: { create: () => new AppImageUpdater(), installsOnQuit: true },
  deb: { create: () => new DebInstaller(), installsOnQuit: false },
  rpm: { create: () => new RpmUpdater(), installsOnQuit: false },
};
