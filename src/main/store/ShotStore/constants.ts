/** Every workspace's shots' records, and the folder their images are in (both in the workspace folder). */
export const SHOTS_FILE = 'shots.json';
export const SHOTS_DIR = 'shots';

/** The records file's version: a newer one is read as none rather than misread. */
export const SHOTS_VERSION = 1;

/** Bytes of a shot's id. */
export const SHOT_ID_BYTES = 4;

/** At most this many shots per workspace, and this large each file. */
export const MAX_SHOTS = 500;
export const MAX_SHOT_BYTES = 50 * 1024 * 1024;

/** The longest name a shot is given. */
export const MAX_SHOT_NAME = 200;

/** The largest side, in pixels, a shot's image may have. */
export const MAX_SHOT_SIDE = 100_000;

/** A shot's thumbnail, beside its image: `<id>.thumb.jpg`. */
export const THUMB_SUFFIX = '.thumb.jpg';

/** The image types a shot is kept as, by their extension. */
export const SHOT_EXTENSIONS = ['png', 'jpg', 'webp'] as const;

/** Characters a shot's name can't hold: path separators, and those Windows refuses in file names, and controls. */
// oxlint-disable-next-line no-control-regex -- control characters are exactly what it removes
export const UNSAFE_NAME_CHARS = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;
