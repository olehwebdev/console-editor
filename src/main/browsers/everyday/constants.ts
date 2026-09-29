/** A Firefox session file's header: its magic, then the JSON's length (32-bit, little-endian), then an LZ4 block. */
export const MOZ_LZ4 = { magic: 'mozLz40\0', sizeAt: 8, dataAt: 12 } as const;

/** An LZ4 sequence's token: the literal length in its high nibble, the match length (less its minimum) in its low one. */
export const LZ4 = { lengthBits: 4, nibble: 15, more: 255, minMatch: 4, offsetBytes: 2 } as const;

/** The session file Firefox keeps up to date as it runs, in its profile. */
export const SESSION_FILE = ['sessionstore-backups', 'recovery.jsonlz4'] as const;

/** Firefox's list of profiles, in its data folder. */
export const PROFILES_INI = 'profiles.ini';

/** Where Firefox keeps its data on each system, from the home folder; Linux's Snap and Flatpak keep theirs apart. */
export const FIREFOX_DATA_DIRS: Partial<Record<NodeJS.Platform, readonly string[]>> = {
  linux: ['.mozilla/firefox', 'snap/firefox/common/.mozilla/firefox', '.var/app/org.mozilla.firefox/.mozilla/firefox'],
  darwin: ['Library/Application Support/Firefox'],
  win32: ['AppData/Roaming/Mozilla/Firefox'],
};

/** profiles.ini: an install's default profile (`[Install…]` groups), and the profiles (`[Profile…]` groups). */
export const PROFILES_KEYS = { installGroup: 'Install', profileGroup: 'Profile', installDefault: 'Default', path: 'Path', name: 'Name', relative: 'IsRelative', relativeYes: '1' } as const;
