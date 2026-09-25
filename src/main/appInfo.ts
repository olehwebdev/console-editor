/** Identifies the app to the OS: the macOS bundle id, the Windows AppUserModelID, the installers' app id. */
export const APP_ID = 'io.github.olehwebdev.console-editor';

export const REPO_SLUG = 'olehwebdev/console-editor';
export const REPO_URL = `https://github.com/${REPO_SLUG}`;

/**
 * The app's name to Linux desktops: its executable, its `.desktop` file, the icon that file names, and its
 * windows' class and Wayland app id (package.json's `desktopName` is this plus `.desktop`).
 */
export const LINUX_APP_NAME = 'console-editor';

/** Its menu category (freedesktop.org's registered categories). */
export const LINUX_CATEGORY = 'Development';

/** The folder in the app's resources holding its Linux icons, one `<n>x<n>.png` per size (from build/icons). */
export const LINUX_ICONS_RESOURCE = 'icons';
