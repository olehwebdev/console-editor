import { join } from 'node:path';
import { LINUX_APP_NAME } from '../appInfo';
import { DESKTOP_FILE_EXTENSION, XDG } from './constants';
import { desktopEntryText } from './desktopEntryText';
import { installIcons } from './installIcons';
import type { DesktopEntryTarget } from './types';
import { writeIfChanged } from './writeIfChanged';

/**
 * Installs for the user what the .deb and .rpm install for everyone: the app's icons, and a desktop entry that
 * starts `launcher`, named after the windows' app id. Each file is written only when it changed, such as the
 * entry after an update renamed the AppImage. Says whether the entry was written.
 */
export async function installDesktopEntry({ launcher, bundledIcons, dataHome }: DesktopEntryTarget): Promise<boolean> {
  const entry = desktopEntryText(launcher);
  if (!entry) return false;
  // Icons first: a desktop that finds the entry looks its icon up at once.
  await installIcons(bundledIcons, dataHome);
  return writeIfChanged(join(dataHome, XDG.applications, `${LINUX_APP_NAME}${DESKTOP_FILE_EXTENSION}`), entry);
}
