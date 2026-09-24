/** CDP target type of an out-of-process iframe. */
export const IFRAME_TARGET_TYPE = 'iframe';

/**
 * Cross-site iframes run in their own renderer process (site isolation) and are
 * separate CDP targets. Auto-attach pauses each one before it loads anything,
 * so an engine can be set up on it first. Workers are deliberately excluded.
 */
export const IFRAME_AUTO_ATTACH = {
  autoAttach: true,
  waitForDebuggerOnStart: true,
  flatten: true,
  filter: [{ type: IFRAME_TARGET_TYPE }, { exclude: true }],
} as const;

/**
 * Upper bound for setting up an iframe (and for one fan-out step on it). A
 * paused iframe blocks its page, so after this we resume it regardless and
 * report that its first loads may bypass overrides.
 */
export const IFRAME_SETUP_TIMEOUT_MS = 5000;
