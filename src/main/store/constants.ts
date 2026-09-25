import type { WorkspaceIcon } from '../../shared/types';

/** Tab ids also name draft files, so nothing else (no path separators) is accepted. */
export const TAB_ID = /^[\w-]{1,64}$/;

/** Workspace ids are this many random bytes, as hex. */
export const WORKSPACE_ID_BYTES = 4;
export const WORKSPACE_ID = new RegExp(`^[0-9a-f]{${WORKSPACE_ID_BYTES * 2}}$`);

/** The longest page title kept for a workspace. */
export const MAX_TITLE = 200;

/** What a new workspace's tile shows, and one saved with an unknown icon. */
export const DEFAULT_WORKSPACE_ICON: WorkspaceIcon = 'favicon';

/** Rule ids are this many random bytes, as hex. */
export const RULE_ID_BYTES = 4;
export const RULE_ID = new RegExp(`^[0-9a-f]{${RULE_ID_BYTES * 2}}$`);

/** Frame names a workspace keeps. */
export const MAX_FRAME_NAMES = 200;
