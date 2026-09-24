import { app, net, shell } from 'electron';
import { join } from 'node:path';
import { detectInstallMethod, electronAutoInstaller } from '../update/electronInstaller';
import { updateEndpoints } from '../update/updateEndpoints';
import { UpdateService } from '../update/UpdateService';
import { USER_DATA } from './constants';
import type { UpdaterDeps } from './types';

/** Data without update.json is 0.1.0's, which kept no record of its version. */
const UNRECORDED_VERSION = '0.1.0';

/** A macOS disk image. */
const DISK_IMAGE_EXTENSION = '.dmg';

/** The app's updater, on GitHub's releases (or `updateFeed`'s in tests). */
export function createUpdater({ updateFeed, userData, hadData, settings, send, closing }: UpdaterDeps): UpdateService {
  return new UpdateService({
    currentVersion: app.getVersion(),
    platform: process.platform,
    // An Intel build running under Rosetta updates to the Apple silicon one.
    arch: process.arch === 'arm64' || app.runningUnderARM64Translation ? 'arm64' : 'x64',
    enabled: app.isPackaged || !!updateFeed,
    endpoints: updateEndpoints(updateFeed),
    fetch: (url, init) => net.fetch(url, init),
    autoInstaller: async () => {
      const method = await detectInstallMethod();
      return method ? electronAutoInstaller(method, updateFeed) : null;
    },
    downloadsDir: updateFeed ? join(userData, USER_DATA.downloads) : app.getPath('downloads'),
    stateFile: join(userData, USER_DATA.updateRecord),
    unrecordedVersion: hadData ? UNRECORDED_VERSION : null,
    autoCheck: () => settings.get().checkForUpdates,
    send: (state) => send({ type: 'update', state }),
    prepareToQuit: () => closing.prepareToQuit(),
    cancelQuit: () => closing.cancelQuit(),
    // A disk image opens (mounted, in Finder); anything else is shown in its folder.
    showFile: async (file) => {
      if (file.endsWith(DISK_IMAGE_EXTENSION)) await shell.openPath(file);
      else shell.showItemInFolder(file);
    },
  });
}
