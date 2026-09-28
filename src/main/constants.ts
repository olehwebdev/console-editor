/** A URL the app takes from outside (the command line, macOS, a link for the browser): only http(s) ones. */
export const HTTP_URL = /^https?:\/\//i;

/** A page URL worth loading or reopening: not about:blank, data: or an error page. */
export const HTTP_SCHEME = /^https?:/i;

/** OpenSSL's name for SHA-256: served files' hashes, update checksums. */
export const SHA256 = 'sha256';

/** Node's error code for a file or folder that doesn't exist. */
export const FILE_NOT_FOUND = 'ENOENT';

/** A data URL of an image: a site icon as kept. */
export const IMAGE_DATA_URL = /^data:image\/[\w.+-]+[;,]/i;

/** Matches the --canvas token, so nothing flashes before a window's UI paints. */
export const CANVAS_COLOR = '#08080a';

/** Matches the --surface token: panels' background (the Actions window's). */
export const SURFACE_COLOR = '#0d0d0f';

/** Matches the --fg-muted token: the window buttons drawn over the title bar, as quiet as its other icons. */
export const TITLE_BAR_SYMBOL_COLOR = '#9d9ea5';

/** The editor's title bar (--titlebar-h, 44 px) less its bottom border, which runs on under the window buttons. */
export const TITLE_BAR_HEIGHT = 43;

/** Where electron-vite puts the preload script, relative to the main bundle. */
export const PRELOAD_SCRIPT = '../preload/index.js';
