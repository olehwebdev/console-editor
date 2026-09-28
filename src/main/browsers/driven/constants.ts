/** Where a driven browser's profile is kept, in the app's data folder (one folder per browser). */
export const PROFILES_DIR = 'browsers';

/** The profile folder's name inside a Snap's or Flatpak's own writable folder. */
export const SANDBOXED_PROFILE = 'console-editor-profile';

/** A Snap's own writable folder: `~/snap/<name>/common`; a Flatpak's: `~/.var/app/<app id>/data`. */
export const SANDBOX_DIRS = { snapBin: '/snap/bin/', snap: 'snap', snapCommon: 'common', flatpak: 'flatpak', flatpakRun: 'run', flatpakData: '.var/app', flatpakDataSub: 'data' } as const;

/** The file Chromium writes in its profile when started with a debugging port: the port, then the browser's path. */
export const ACTIVE_PORT_FILE = 'DevToolsActivePort';

/** Waiting for a launched browser to write it. */
export const ACTIVE_PORT_WAIT = { timeoutMs: 30_000, stepMs: 150 } as const;

/** What a browser started to be driven is given: a debugging port the system picks, and no first-run pages. */
export const DRIVE_FLAGS = ['--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check'] as const;
export const USER_DATA_FLAG = '--user-data-dir=';
export const DISABLE_FEATURES_FLAG = '--disable-features=';

/** The page a driven browser starts on: nothing loads before the app has attached to it. */
export const START_URL = 'about:blank';

/** macOS: `open -n -a <app> --args <flags…>` starts a new instance with flags. */
export const MAC_OPEN = { newInstance: '-n', args: '--args' } as const;

/** Flatpak's markers around forwarded files: flags go before them. */
export const FLATPAK_MARKERS: readonly string[] = ['@@u', '@@'];

/** The target type of a tab. */
export const PAGE_TARGET = 'page';

/**
 * Every tab of a driven browser is attached, and one opened later waits (before it loads anything) until its
 * interception is set up. Its frames and workers are attached below it, by its own interception.
 */
export const PAGE_ATTACH = { autoAttach: true, waitForDebuggerOnStart: true, flatten: true, filter: [{ type: PAGE_TARGET }, { exclude: true }] } as const;

/** Letting go of a driven browser's tabs: new ones start as they would. */
export const STOP_ATTACH = { autoAttach: false, waitForDebuggerOnStart: false, flatten: true } as const;

/** How long a tab captured in every browser may take to load before it is captured as it is. */
export const LOAD_TIMEOUT_MS = 30_000;

/** How long a tab the app opens has to be attached before opening it fails. */
export const NEW_TAB_TIMEOUT_MS = 10_000;

/** `Browser.getVersion`'s product: `Chrome/140.0.7339.80`, the version after the slash. */
export const PRODUCT_VERSION = /\/(\S+)$/;

/** Waiting this long after overrides or rules change before reloading driven tabs (a burst reloads them once). */
export const RELOAD_DEBOUNCE_MS = 300;
