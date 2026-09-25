/** Tags each step of a row key (a root, a folder, the libraries group, a file, a status line), so keys never collide. */
export const KEY_TAG = { root: 'r', dir: 'd', library: 'l', source: 'f', status: 's' } as const;

/** The scheme of a web origin, left out of root labels. */
export const WEB_SCHEME = /^https?:\/\//;
