import type { ResourceKind } from '@common/types';

/** Which kinds of file can name a source map (a document's inline scripts are out of scope). */
export const MAPPABLE_KINDS: Record<ResourceKind, boolean> = { Script: true, Stylesheet: true, Document: false };

/** Joins a bundle URL and an original's URL into one key (a NUL can't be in either). */
export const SOURCE_KEY_SEPARATOR = '\u0000';

/** Starts the key of a bundle's nest of originals in the Explorer, so it never equals a resource key. */
export const BUNDLE_KEY_PREFIX = '\u0001';

/** C0 control characters and DEL, which a page could put in a source's name. */
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
export const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
