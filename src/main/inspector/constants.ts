/** How long after a frame stops loading it is looked at: frameworks mount once their scripts have run. */
export const DETECT_DELAY_MS = 1000;
/** A frame busy in a loop doesn't hold a scan up longer than this. */
export const DETECT_TIMEOUT_MS = 5000;
/** At most this many findings are taken from a frame. */
export const MAX_HITS = 40;
/** What a version the page reports must look like to be shown. */
export const VERSION_PATTERN = /^[\w.+-]{1,40}$/;
