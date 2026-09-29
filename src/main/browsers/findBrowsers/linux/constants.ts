/** What the Desktop Entry spec says a browser's launcher looks like, and where the app looks for them. */
export const DESKTOP_ENTRY = {
  /** The group holding the entry's own keys (others are its actions). */
  group: '[Desktop Entry]',
  extension: '.desktop',
  /** The category browsers file themselves under. */
  browserCategory: 'WebBrowser',
  /** Handling these schemes, with HTML files, marks a browser that names no category. */
  webSchemes: ['x-scheme-handler/http', 'x-scheme-handler/https'],
  html: 'text/html',
  /** Launchers for the app itself are left out. */
  ownName: 'console-editor',
} as const;

/** Where launchers live besides the XDG data folders: what Flatpak and Snap export (usually on XDG_DATA_DIRS already). */
export const PACKAGED_DATA_DIRS = ['/var/lib/flatpak/exports/share', '/var/lib/snapd/desktop'] as const;

/** The user's own Flatpak exports, under the home folder. */
export const USER_FLATPAK_DATA_DIR = '.local/share/flatpak/exports/share';

/** Labels added to a browser's name when two have the same one: where each came from. */
export const PACKAGE_LABELS: readonly (readonly [RegExp, string])[] = [
  [/\/flatpak\//, 'Flatpak'],
  [/\/snapd?\//, 'Snap'],
];

/** Exec field codes that stand for the address opened (the first one used is replaced, the rest dropped). */
export const URL_FIELD_CODES = ['%u', '%U', '%f', '%F'] as const;

/** Any other field code: dropped. `%%` is a literal percent sign. */
export const FIELD_CODE = /^%[a-zA-Z]$/;
export const LITERAL_PERCENT = '%%';

/** Icon sizes to take, best first: sharp at 32 px on a 2× screen, then larger ones scaled down, then smaller ones. */
export const ICON_SIZES = ['64x64', '128x128', '96x96', '256x256', '512x512', '48x48', '32x32'] as const;

/** Icon themes to look in: the user's first, then the fallback theme every app installs into. */
export const ICON_FOLDERS = { themes: 'icons/hicolor', userIcons: '.icons/hicolor', context: 'apps', scalable: 'scalable', pixmaps: '/usr/share/pixmaps' } as const;

/** The image types an icon comes as, by extension. */
export const ICON_EXTENSIONS = ['.png', '.svg'] as const;
