/** Where desktops look for a user's own launchers and icons (the XDG Base Directory, Desktop Entry and Icon Theme specs). */
export const XDG = {
  /** Names the user's data folder when set to an absolute path. */
  dataHomeEnv: 'XDG_DATA_HOME',
  /** The data folder otherwise, under the home folder. */
  defaultDataHome: '.local/share',
  /** Desktop entries, in the data folder. */
  applications: 'applications',
  /** The theme every icon theme falls back to, so the icon shows under any of them. */
  iconTheme: 'icons/hicolor',
  /** An icon's context folder, in each size's folder of the theme. */
  iconContext: 'apps',
} as const;

export const DESKTOP_FILE_EXTENSION = '.desktop';
export const ICON_EXTENSION = '.png';

/** A bundled icon: `<n>x<n>.png`, which is also the name of its size's folder in an icon theme. */
export const ICON_FILE = /^\d+x\d+\.png$/;
