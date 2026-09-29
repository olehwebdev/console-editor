/** The file Chromium writes in its profile when started with a debugging port: the port, then the browser's path. */
export const ACTIVE_PORT_FILE = 'DevToolsActivePort';

/** What a browser started to be driven is given: a debugging port the system picks, and no first-run pages. */
export const DRIVE_FLAGS = ['--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check'] as const;
export const USER_DATA_FLAG = '--user-data-dir=';
export const DISABLE_FEATURES_FLAG = '--disable-features=';

/** The target type of a tab. */
export const PAGE_TARGET = 'page';

/**
 * Every tab of a driven browser is attached, and one opened later waits (before it loads anything) until its
 * interception is set up. Its frames and workers are attached below it, by its own interception.
 */
export const PAGE_ATTACH = { autoAttach: true, waitForDebuggerOnStart: true, flatten: true, filter: [{ type: PAGE_TARGET }, { exclude: true }] } as const;

/** Letting go of a driven browser's tabs: new ones start as they would. */
export const STOP_ATTACH = { autoAttach: false, waitForDebuggerOnStart: false, flatten: true } as const;

/** `Browser.getVersion`'s product: `Chrome/140.0.7339.80`, the version after the slash. */
export const PRODUCT_VERSION = /\/(\S+)$/;
