import { app } from 'electron';
import { join } from 'node:path';
import { LINUX_ICONS_RESOURCE } from '../appInfo';
import { installDesktopEntry } from './installDesktopEntry';
import { launcherPath } from './launcherPath';
import { xdgDataHome } from './xdgDataHome';

/**
 * Linux: gives a copy with no package behind it (the AppImage, an unpacked .tar.gz) the desktop entry and icons
 * the .deb and .rpm install. Desktops find a window's icon through the entry named after its app id; GNOME on
 * Wayland has no other way, so without one these copies ran with a generic icon. Run on every start: an
 * AppImage update renames the file, and brings the new version's icons.
 */
export async function integrateWithDesktop(): Promise<void> {
  if (process.platform !== 'linux' || !app.isPackaged) return;
  const launcher = await launcherPath();
  if (!launcher) return;
  await installDesktopEntry({ launcher, bundledIcons: join(process.resourcesPath, LINUX_ICONS_RESOURCE), dataHome: xdgDataHome() });
}
