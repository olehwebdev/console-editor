import type { AppUpdater } from 'electron-updater';

/** How this copy was installed, among the kinds that can update themselves. */
export type InstallMethod = 'nsis' | 'appimage' | 'deb' | 'rpm';

export interface InstallMethodUpdater {
  create(): AppUpdater;
  /** Whether quitting after a download installs it too. */
  installsOnQuit: boolean;
}
