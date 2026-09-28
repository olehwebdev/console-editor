/** Where apps are installed: for everyone, then for the user alone (under the home folder). */
export const MAC_APP_DIRS = { system: '/Applications', user: 'Applications' } as const;

export const APP_EXTENSION = '.app';

/** Opens an address in a given app: `open -a <app> <url>`. */
export const OPEN_COMMAND = 'open';
export const OPEN_APP_FLAG = '-a';
