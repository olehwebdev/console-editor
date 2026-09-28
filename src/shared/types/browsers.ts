/** The engines the app tells apart: what it can do with a browser depends on its engine. */
export const BROWSER_ENGINES = ['chromium', 'gecko', 'webkit', 'unknown'] as const;

export type BrowserEngine = (typeof BROWSER_ENGINES)[number];

/** The engines whose browsers the app can drive with the workspace's changes: Chromium's over CDP, Firefox over WebDriver BiDi. */
export const DRIVEN_ENGINES = ['chromium', 'gecko'] as const satisfies readonly BrowserEngine[];

export type DrivenEngine = (typeof DRIVEN_ENGINES)[number];

/** A browser installed on this computer, or one the user added. */
export interface BrowserInfo {
  /** Stable across scans: the desktop entry's, the app's or the registry key's name, or `added:<8 hex>`. */
  id: string;
  name: string;
  engine: BrowserEngine;
  /** Its version, once read (null until then, or when it can't be). */
  version: string | null;
  /** Its icon from the system, as a data URL; null when the system has none to give. */
  icon: string | null;
  /** The user added it (Settings › Browsers), so it can be removed there. */
  added: boolean;
  /** Turned off in Settings › Browsers: not offered beside the address bar. */
  hidden: boolean;
}

/** A tab of a browser the app drives. */
export interface DrivenTab {
  /** Its target id. */
  id: string;
  title: string;
  url: string;
}

/** A browser the app launched with a profile of its own, and serves the workspace's overrides and rules in. */
export interface DrivenBrowser {
  /** The installed browser's id. */
  id: string;
  name: string;
  version: string | null;
  tabs: DrivenTab[];
}
