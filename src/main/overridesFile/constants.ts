/** What an export of overrides says it is, so an import can tell it from any other JSON. */
export const OVERRIDES_FILE_FORMAT = 'console-editor-overrides';

/** The version of the file written; an import refuses a newer one. */
export const OVERRIDES_FILE_VERSION = 1;

/** The file types the export and import dialogs offer. */
export const OVERRIDES_FILE_FILTERS = [{ name: 'Console Editor overrides', extensions: ['json'] }];

/** The biggest file imported, in bytes: overrides hold whole bundles. */
export const MAX_OVERRIDES_FILE_BYTES = 200 * 1024 * 1024;

/** The most overrides one file may list. */
export const MAX_IMPORTED_OVERRIDES = 500;

/** A SHA-256 as the engine writes it: what an override's `originalHash` holds. */
export const SHA256_HEX = /^[0-9a-f]{64}$/;
