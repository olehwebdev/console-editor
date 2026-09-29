import type { BrowserEngine } from '../../shared/types';

/**
 * How a browser's engine is told from its names (launcher id, program, app or registry name), first match first:
 * what the app can do with it depends on the engine. Names no pattern knows are `unknown` (open only).
 */
export const ENGINE_PATTERNS: readonly (readonly [RegExp, BrowserEngine])[] = [
  [/firefox|librewolf|waterfox|floorp|icecat|mullvad|tor[- ]?browser|seamonkey|palemoon|\bzen\b|zen[-_.]browser/i, 'gecko'],
  [/safari|epiphany|gnome[- ]web|\borion\b/i, 'webkit'],
  [/chrom(e|ium)|msedge|microsoft[- ]edge|brave|vivaldi|\bopera\b|^arc$|thorium|yandex|ungoogled/i, 'chromium'],
];

/** How long a scan for installed browsers is reused before the next one looks again. */
export const SCAN_REUSE_MS = 60_000;

/** The icon's longest side, in pixels: sharp at 32 px on a 2× screen. */
export const ICON_SIZE = 64;

/** An SVG icon larger than this is left out (they are usually a few kilobytes). */
export const MAX_SVG_ICON_BYTES = 256 * 1024;

/** How long asking a browser for its version may take before it is given up on. */
export const VERSION_TIMEOUT_MS = 5000;

/** A version number in a program's answer (`Mozilla Firefox 131.0.3`). */
export const VERSION_NUMBER = /\d+(?:\.\d+)+/;

/** The flag Chromium and Firefox answer with their version, without opening a window. */
export const VERSION_FLAG = '--version';

/** Ids of browsers the user added, and of the ones found per system. */
export const BROWSER_ID_PREFIX = { added: 'added:', desktop: 'desktop:', mac: 'mac:', windows: 'win:' } as const;

/**
 * Variables an AppImage's launcher sets for the app's own libraries: a browser started with them loads the wrong
 * ones, so they are dropped when the app runs as an AppImage.
 */
export const APPIMAGE_ENV = { marker: 'APPIMAGE', dropped: ['LD_LIBRARY_PATH', 'LD_PRELOAD', 'GDK_PIXBUF_MODULE_FILE', 'GIO_EXTRA_MODULES', 'GSETTINGS_SCHEMA_DIR', 'GTK_PATH', 'QT_PLUGIN_PATH', 'PYTHONHOME', 'PYTHONPATH', 'PERLLIB'] } as const;
