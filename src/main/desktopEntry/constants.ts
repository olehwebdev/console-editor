import { LINUX_APP_NAME } from '../appInfo';

/** Where desktops look for launchers and icons (the XDG Base Directory, Desktop Entry and Icon Theme specs). */
export const XDG = {
  /** Names the user's data folder when set to an absolute path. */
  dataHomeEnv: 'XDG_DATA_HOME',
  /** The data folder otherwise, under the home folder. */
  defaultDataHome: '.local/share',
  /** Names the system's data folders, where packages install, most important first. */
  dataDirsEnv: 'XDG_DATA_DIRS',
  /** The system's data folders otherwise. */
  defaultDataDirs: ['/usr/local/share', '/usr/share'],
  /** Desktop entries, in a data folder. */
  applications: 'applications',
  /** The theme every icon theme falls back to, so the icon shows under any of them. */
  iconTheme: 'icons/hicolor',
  /** An icon's context folder, in each size's folder of the theme. */
  iconContext: 'apps',
} as const;

/** The app's desktop entry, named after its windows' app id (what the .deb and .rpm install too). */
export const ENTRY_FILE = `${LINUX_APP_NAME}.desktop`;

export const ICON_EXTENSION = '.png';

/** The app's icon in each size's folder of a theme, named as the entry's Icon key says. */
export const ICON_NAME = `${LINUX_APP_NAME}${ICON_EXTENSION}`;

/** A bundled icon: `<n>x<n>.png`, which is also the name of its size's folder in an icon theme. */
export const ICON_FILE = /^\d+x\d+\.png$/;

/** A line in every entry the app installs for itself: it only ever removes an entry that has it. */
export const OWN_ENTRY_MARKER = 'X-Console-Editor-Self-Installed=true';
