export interface Settings {
  /** Reload the page after an override is saved. */
  autoReloadOnSave: boolean;
  /** Remove `integrity` attributes from HTML so edited scripts/styles are not rejected by SRI. */
  stripIntegrity: boolean;
  /** Remove sourceMappingURL comments/headers from overridden files (maps no longer line up). */
  stripSourceMaps: boolean;
  /** Bypass service workers so cached assets can't sidestep overrides. */
  bypassServiceWorker: boolean;
  /** Disable the HTTP cache so every load goes through interception. */
  disableCache: boolean;
  /** Ignore the page's Content-Security-Policy (useful when a patch uses eval or inline code). */
  bypassCSP: boolean;
  /** Pretty-print minified files when they are opened. */
  autoFormatMinified: boolean;
  /** Look for a newer release on GitHub at start and every few hours. */
  checkForUpdates: boolean;
  /** Record the console of the page and its frames (off: for a site that reacts to an attached debugger). */
  captureConsole: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  autoReloadOnSave: true,
  stripIntegrity: true,
  stripSourceMaps: true,
  bypassServiceWorker: true,
  disableCache: true,
  bypassCSP: false,
  autoFormatMinified: true,
  checkForUpdates: true,
  captureConsole: true,
};
