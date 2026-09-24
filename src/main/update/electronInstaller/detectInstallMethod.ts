import { app } from 'electron';
import { runsFromAppImage } from './runsFromAppImage';
import { succeeds } from './succeeds';
import type { InstallMethod } from './types';

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
