/** How fast the page's network is made to be: as it is, like a mobile connection, or offline. */
export const THROTTLING_PRESETS = ['off', 'fast-4g', 'slow-4g', '3g', 'offline'] as const;

export type Throttling = (typeof THROTTLING_PRESETS)[number];

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
  /** Put a stand-in for the React DevTools hook in every new document, so the page stack can tell which React a frame runs. */
  frameworkHooks: boolean;
  /** The network speed the page, its iframes and its workers get (the app's own requests aren't slowed). */
  throttling: Throttling;
}

/** The settings that are on or off (a switch each). */
export type SwitchSetting = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

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
  frameworkHooks: true,
  throttling: 'off',
};
