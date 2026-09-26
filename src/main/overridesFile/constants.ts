/** The file types the export and import dialogs offer. */
export const OVERRIDES_FILE_FILTERS = [{ name: 'Console Editor overrides', extensions: ['json'] }];

/** The biggest file imported, in bytes: overrides hold whole bundles. */
export const MAX_OVERRIDES_FILE_BYTES = 200 * 1024 * 1024;
