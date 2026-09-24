import { execFile } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';
import { app } from 'electron';
import { AppImageUpdater, type AppUpdater, DebUpdater, NsisUpdater, RpmUpdater } from 'electron-updater';
import type { InstallOptions } from 'electron-updater/out/BaseUpdater';
import type { AutoInstaller } from './UpdateService';

/** How this copy was installed, among the kinds that can update themselves. */
export type InstallMethod = 'nsis' | 'appimage' | 'deb' | 'rpm';

/**
 * Whether this copy can install an update itself, and how: null when you install
 * the download (builds run from source, macOS, the .tar.gz).
 *
 * macOS: Apple's updater only takes apps signed with a Developer ID, which these
 * builds aren't yet. On Linux the package manager is asked who owns the app, not
 * electron-builder's resources/package-type marker: the .deb and .rpm are built
 * side by side from the same folder, so the marker can name the other one (and
 * end up in the AppImage and .tar.gz too).
 */
export async function detectInstallMethod(): Promise<InstallMethod | null> {
  if (!app.isPackaged) return null;
  if (process.platform === 'win32') return 'nsis';
  if (process.platform !== 'linux') return null;
  if (runsFromAppImage()) return 'appimage';
  if (await succeeds('dpkg-query', ['-S', process.execPath])) return 'deb';
  if (await succeeds('rpm', ['-qf', process.execPath])) return 'rpm';
  return null;
}

/**
 * Whether this process runs from the AppImage that APPIMAGE names. The AppImage runtime sets APPIMAGE and
 * APPDIR (where it mounted or unpacked the image), and programs started from another AppImage (its built-in
 * terminal, say) inherit that one's: updating would then replace another app's file.
 */
function runsFromAppImage(): boolean {
  const { APPIMAGE, APPDIR } = process.env;
  if (!APPIMAGE || !APPDIR) return false;
  // The runtime builds APPDIR from TMPDIR as given (links, doubled slashes); execPath is the resolved path.
  let dir: string;
  try {
    dir = realpathSync(APPDIR);
  } catch {
    return false;
  }
  const inside = relative(dir, process.execPath);
  return !!inside && !inside.startsWith('..') && !isAbsolute(inside);
}

/**
 * electron-updater's .deb install runs dpkg and, when that fails for any reason, apt-get to add missing
 * dependencies, each behind its own password prompt: cancelling the first brings up the second, and
 * passing that one restarts into the old version. One elevated shell asks once.
 */
class DebInstaller extends DebUpdater {
  protected override doInstall(options: InstallOptions): boolean {
    const file = this.installerPath;
    if (file == null) {
      this.dispatchError(new Error("No update filepath provided, can't quit and install"));
      return false;
    }
    try {
      // apt-get adds missing dependencies and finishes the install; dpkg runs again so that any other failure
      // (a file another package owns, say) still fails here instead of restarting into the old version.
      this.runCommandWithSudoIfNeeded(['dpkg', '-i', file, '||', '(apt-get', 'install', '-f', '-y', '&&', 'dpkg', '-i', `${file})`]);
    } catch (err) {
      this.dispatchError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
    if (options.isForceRunAfter) this.app.relaunch();
    return true;
  }
}

function succeeds(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 10_000 }, (err) => resolve(!err));
  });
}

/**
 * electron-updater, for copies it can update in place: the Windows installer,
 * the AppImage, the .deb and the .rpm. It reads the release's latest*.yml (the
 * right file for this system and architecture) and checks the download's
 * SHA-512 before installing.
 *
 * @param feed A local update server (tests) instead of the GitHub release.
 */
export function electronAutoInstaller(method: InstallMethod, feed?: string): AutoInstaller {
  const updater: AppUpdater =
    method === 'nsis' ? new NsisUpdater() : method === 'appimage' ? new AppImageUpdater() : method === 'deb' ? new DebInstaller() : new RpmUpdater();
  updater.autoDownload = false;
  // Quitting after a download installs it too, where that needs no password (not a .deb or .rpm, which ask for one).
  // Set before downloading: that is when the updater decides whether to install on quit.
  updater.autoInstallOnAppQuit = method === 'nsis' || method === 'appimage';
  updater.allowDowngrade = false;
  updater.allowPrerelease = false;
  updater.disableWebInstaller = true;
  if (feed) updater.setFeedURL({ provider: 'generic', url: `${feed}/download`, useMultipleRangeRequest: false });
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
