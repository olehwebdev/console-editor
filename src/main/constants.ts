/** A URL the app takes from outside (the command line, macOS, a link for the browser): only http(s) ones. */
export const HTTP_URL = /^https?:\/\//i;

/** A page URL worth loading or reopening: not about:blank, data: or an error page. */
export const HTTP_SCHEME = /^https?:/i;

/** OpenSSL's name for SHA-256: served files' hashes, update checksums. */
export const SHA256 = 'sha256';

/** Node's error code for a file or folder that doesn't exist. */
export const FILE_NOT_FOUND = 'ENOENT';
