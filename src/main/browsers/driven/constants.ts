/** Where a driven browser's profile is kept, in the app's data folder (one folder per browser). */
export const PROFILES_DIR = 'browsers';

/** The profile folder's name inside a Snap's or Flatpak's own writable folder. */
export const SANDBOXED_PROFILE = 'console-editor-profile';

/** A Snap's own writable folder: `~/snap/<name>/common`; a Flatpak's: `~/.var/app/<app id>/data`. */
export const SANDBOX_DIRS = { snapBin: '/snap/bin/', snap: 'snap', snapCommon: 'common', flatpak: 'flatpak', flatpakRun: 'run', flatpakData: '.var/app', flatpakDataSub: 'data' } as const;

/** Waiting for a launched browser to write the address of its debugging port in its profile. */
export const PORT_WAIT = { timeoutMs: 30_000, stepMs: 150 } as const;

/** The page a driven browser starts on: nothing loads before the app has attached to it. */
export const START_URL = 'about:blank';

/** macOS: `open -n -a <app> --args <flags…>` starts a new instance with flags. */
export const MAC_OPEN = { newInstance: '-n', args: '--args' } as const;

/** Flatpak's markers around forwarded files: flags go before them. */
export const FLATPAK_MARKERS: readonly string[] = ['@@u', '@@'];

/** How long a tab captured in every browser may take to load before it is captured as it is. */
export const LOAD_TIMEOUT_MS = 30_000;

/** How long a tab the app opens has to be attached before opening it fails. */
export const NEW_TAB_TIMEOUT_MS = 10_000;

/** Waiting this long after overrides or rules change before reloading driven tabs (a burst reloads them once). */
export const RELOAD_DEBOUNCE_MS = 300;

/** A design's width laid out in another browser's tab: its window keeps its height (0: not overridden) and density. */
export const FIT_METRICS = { height: 0, deviceScaleFactor: 0, mobile: false } as const;
