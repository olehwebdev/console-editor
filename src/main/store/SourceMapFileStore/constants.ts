/** Where the files live, in the workspace folder, and the index naming them. */
export const SOURCE_MAPS_DIR = 'source-maps';
export const INDEX_FILE = 'index.json';
/** A copy's extension: it is kept as it was picked. */
export const MAP_EXTENSION = '.map';
/** The most maps a workspace keeps loaded from files. */
export const MAX_MAP_FILES = 200;
/** The largest map file taken (as a map fetched from the site may be). */
export const MAX_MAP_FILE_BYTES = 64 * 1024 * 1024;
/** The longest bundle URL or file name kept. */
export const MAX_NAME_LENGTH = 2048;
