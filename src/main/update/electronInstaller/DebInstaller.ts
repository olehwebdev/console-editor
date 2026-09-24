import { DebUpdater } from 'electron-updater';
import type { InstallOptions } from 'electron-updater/out/BaseUpdater';

/**
 * electron-updater's .deb install runs dpkg and, when that fails for any reason, apt-get to add missing
 * dependencies, each behind its own password prompt: cancelling the first brings up the second, and
 * passing that one restarts into the old version. One elevated shell asks once.
 */
export class DebInstaller extends DebUpdater {
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
