/** First automatic check after start, then the interval between checks. */
export const FIRST_CHECK_MS = 10_000;
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** How GitHub answers while it is limiting requests. */
export const RATE_LIMITED_STATUSES = new Set([403, 429]);

/** The release's list of SHA-256 sums, that manual downloads are checked against. */
export const CHECKSUMS_ASSET = 'SHA256SUMS.txt';

/** Added to a manual download's name until its checksum is right. */
export const PARTIAL_DOWNLOAD_SUFFIX = '.download';

/** GitHub's media type for its REST API's JSON. */
export const GITHUB_JSON = 'application/vnd.github+json';
export const CONTENT_LENGTH_HEADER = 'content-length';
/** A SHA-256 sum in hex, as `sha256sum` writes it. */
export const SHA256_HEX = /^[0-9a-f]{64}$/i;
/** What separates a sum from its file's name in `sha256sum` output: spaces, then `*` in binary mode. */
export const SUM_SEPARATOR = /\s+\*?/;
