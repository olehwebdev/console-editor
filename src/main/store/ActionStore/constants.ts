export const ACTIONS_VERSION = 1;

/** Kept next to overrides.json, in the workspace folder. */
export const ACTIONS_FILE = 'actions.json';

/** Action ids are this many random bytes, as hex. */
export const ACTION_ID_BYTES = 4;
export const ACTION_ID = new RegExp(`^[0-9a-f]{${ACTION_ID_BYTES * 2}}$`);

/** The most actions a workspace keeps. */
export const MAX_ACTIONS = 500;
