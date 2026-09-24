/**
 * Constants shared between the main process and the renderer.
 * Keep this file free of runtime imports so every bundle can include it.
 */

/** The location hash (without `#`) that shows the design-system gallery instead of the editor. */
export const GALLERY_HASH = 'gallery';

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
