/** The most rules a workspace holds. */
export const MAX_RULES = 200;

/** The most header changes one rule makes. */
export const MAX_HEADER_EDITS = 32;

/** The longest header name a rule may use. */
export const MAX_HEADER_NAME_CHARS = 256;

/** The longest header value a rule may set. */
export const MAX_HEADER_VALUE_CHARS = 8192;

/** A header name: an RFC 9110 token. */
export const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/** Characters that would split a header value into another header (or cut it short). */
export const HEADER_VALUE_BREAK = /[\r\n\0]/;

/** URLs whose requests the Fetch domain never pauses, so no rule can reach them. */
export const UNINTERCEPTED_URL = /^(wss?|data|blob):/i;

/** Headers a rule may not change, by lower-case name, with the reason shown to the user. */
export const PROTECTED_HEADERS: Readonly<Record<string, string>> = {
  'content-encoding': 'The app frames response bodies itself',
  'content-length': 'The app frames response bodies itself',
  'transfer-encoding': 'The app frames response bodies itself',
  'set-cookie': "Set-Cookie can't be changed: the browser stores cookies before a rule runs",
  location: "Location can't be changed: Chromium follows the server's redirect whatever this header says",
};
