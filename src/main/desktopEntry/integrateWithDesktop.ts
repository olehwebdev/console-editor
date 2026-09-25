import { app } from 'electron';
import { join } from 'node:path';
import { LINUX_ICONS_RESOURCE } from '../appInfo';
import { installDesktopEntry } from './installDesktopEntry';
import { launcherPath } from './launcherPath';
import { packageEntryExists } from './packageEntryExists';
import { removeOwnEntry } from './removeOwnEntry';
import { xdgDataDirs } from './xdgDataDirs';
import { xdgDataHome } from './xdgDataHome';

/**
 * Linux: gives a copy with no package behind it (the AppImage, an unpacked .tar.gz) the desktop entry and icons
 * the .deb and .rpm install. Desktops find a window's icon through the entry named after its app id; GNOME on
 * Wayland has no other way, so without one these copies ran with a generic icon. Run on every start: an
 * AppImage update renames the file, and brings the new version's icons.
 *
 * Where a package installed the entry (the .deb or .rpm, even beside an AppImage), the desktop is left to it,
 * and an entry this app installed earlier goes: it would shadow the package's.
 */
export async function integrateWithDesktop(): Promise<void> {
  if (process.platform !== 'linux' || !app.isPackaged) return;
  const dataHome = xdgDataHome();
  const launcher = await launcherPath();
  if (!launcher || (await packageEntryExists(xdgDataDirs()))) {
    await removeOwnEntry(dataHome);
    return;
  }
  await installDesktopEntry({ launcher, bundledIcons: join(process.resourcesPath, LINUX_ICONS_RESOURCE), dataHome });
}
