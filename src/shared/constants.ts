/**
 * Constants shared between the main process and the renderer.
 * Keep this file free of runtime imports so every bundle can include it.
 */

/** The location hash (without `#`) that shows the design-system gallery instead of the editor. */
export const GALLERY_HASH = 'gallery';

/** The location hash (without `#`) of the website's own window: the preview alone, without the editor. */
export const PAGE_WINDOW_HASH = 'page-window';

/** The longest name a workspace can be given. */
export const MAX_WORKSPACE_NAME = 40;

/** The console rows kept, in the main process and in the panel; older ones drop off. */
export const MAX_CONSOLE_ENTRIES = 5000;

/** The longest name a frame can be given in the console. */
export const MAX_FRAME_NAME = 40;

/** The longest name an action can be given. */
export const MAX_ACTION_NAME = 60;

/** The most code an action keeps, in characters. */
export const MAX_ACTION_CODE = 65_536;

/** Environment variables the main process reads to configure itself. */
export const ENV = {
  /** Keeps app data in this folder instead of the default one (tests, throwaway profiles). */
  userData: 'CONSOLE_EDITOR_USER_DATA',
  /** A URL to open on start when none is passed on the command line. */
  url: 'CONSOLE_EDITOR_URL',
  /** Any value opens the design-system gallery instead of the editor. */
  gallery: 'CONSOLE_EDITOR_GALLERY',
  /** A local update server standing in for GitHub (tests); honoured only with a data folder of its own. */
  updateFeed: 'CONSOLE_EDITOR_UPDATE_FEED',
  /** Set by electron-vite in development: the renderer's dev-server URL. */
  rendererUrl: 'ELECTRON_RENDERER_URL',
} as const;

/**
 * The app's keyboard shortcuts, as the renderer's hints write them (`mod` is ⌘ on macOS, Ctrl elsewhere).
 * The menu's accelerators are built from the same entries, so a hint can't name a key that does something else.
 * Not `as const`: Kbd, Tooltip and IconButton take a mutable `string[]`.
 */
export const SHORTCUT = {
  save: ['mod', 'S'],
  format: ['shift', 'alt', 'F'],
  undo: ['mod', 'Z'],
  /** macOS; elsewhere `redoCtrlY`. */
  redo: ['shift', 'cmd', 'Z'],
  redoCtrlY: ['ctrl', 'Y'],
  selectAll: ['mod', 'A'],
  palette: ['mod', 'K'],
  /** A second key for the palette, as in VS Code. */
  quickOpen: ['mod', 'P'],
  sidebar: ['mod', 'B'],
  /** As VS Code's panel. */
  console: ['mod', 'J'],
  focusUrl: ['mod', 'L'],
  reload: ['mod', 'R'],
  reloadF5: ['F5'],
  diff: ['mod', 'shift', 'D'],
  pageDevTools: ['mod', 'shift', 'J'],
  editorDevTools: ['mod', 'alt', 'I'],
} satisfies Record<string, string[]>;
