import type { AutoInstaller } from '../UpdateService';
import { INSTALL_METHOD_UPDATERS } from './installMethodUpdaters';
import type { InstallMethod } from './types';

/** Where a local update server (tests) serves the installers and their latest*.yml. */
const FEED_DOWNLOAD_PATH = 'download';

/**
 * electron-updater, for copies it can update in place: the Windows installer,
 * the AppImage, the .deb and the .rpm. It reads the release's latest*.yml (the
 * right file for this system and architecture) and checks the download's
 * SHA-512 before installing.
 *
 * @param feed A local update server (tests) instead of the GitHub release.
 */
export function electronAutoInstaller(method: InstallMethod, feed?: string): AutoInstaller {
  const { create, installsOnQuit } = INSTALL_METHOD_UPDATERS[method];
  const updater = create();
  updater.autoDownload = false;
  // Set before downloading: that is when the updater decides whether to install on quit.
  updater.autoInstallOnAppQuit = installsOnQuit;
  updater.allowDowngrade = false;
  updater.allowPrerelease = false;
  updater.disableWebInstaller = true;
  if (feed) updater.setFeedURL({ provider: 'generic', url: `${feed}/${FEED_DOWNLOAD_PATH}`, useMultipleRangeRequest: false });
  return {
    installsOnQuit: updater.autoInstallOnAppQuit,
    async check() {
      const result = await updater.checkForUpdates();
      return result?.isUpdateAvailable ? result.updateInfo.version : null;
    },
    async download(onProgress) {
      const listener = (progress: { percent: number }) => onProgress(progress.percent);
      updater.on('download-progress', listener);
      try {
        await updater.downloadUpdate();
      } finally {
        updater.off('download-progress', listener);
      }
    },
    quitAndInstall() {
      // A .deb or .rpm installs here and now (after asking for a password); a failure is reported as an error event.
      let failure: unknown;
      const onError = (err: Error) => (failure ??= err);
      updater.on('error', onError);
      try {
        // Silent on Windows (no installer wizard), and started again afterwards.
        updater.quitAndInstall(true, true);
      } finally {
        updater.off('error', onError);
      }
      if (failure) throw failure;
    },
  };
}
