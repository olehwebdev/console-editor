import type { ResourceKind } from '../../../shared/types';

export const INDEX_VERSION = 1;
export const INDEX_FILE = 'overrides.json';
/** Marks the file of the text an override was made from: `<id>.base.<ext>`. */
export const BASE_MARK = 'base';
export const FILES_DIR = 'files';

/** Override ids are this many random bytes, as hex. */
export const ID_BYTES = 4;

export const EXTENSIONS: Record<ResourceKind, string> = { Script: 'js', Stylesheet: 'css', Document: 'html', Fetch: 'json' };
