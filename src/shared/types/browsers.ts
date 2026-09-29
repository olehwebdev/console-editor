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
  /** A Chromium browser whose everyday profile runs with remote debugging turned on: it can be driven as it is. */
  debuggable: boolean;
  /** Its everyday tabs can be listed: Firefox's (its session file), and on macOS those scripting reaches (Safari, Chrome…). */
  listsTabs: boolean;
}

/** A tab of your everyday browser (one the app didn't launch), as its session has it. */
export interface EverydayTab {
  title: string;
  url: string;
}

/** Your everyday browser's tabs: for one of its profiles (Firefox), or all of them (read through macOS's scripting). */
export interface EverydayBrowser {
  /** The profile's folder, or the browser's id. */
  id: string;
  name: string;
  /** The profile's name, when the tabs are one profile's. */
  profile: string | null;
  tabs: EverydayTab[];
  /** Why its tabs couldn't be read (macOS didn't allow the app to ask it, say), when they couldn't. */
  problem?: string;
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
  /** Its key among the driven browsers: the installed browser's id, with a suffix for its everyday profile. */
  id: string;
  /** The installed browser's id. */
  browserId: string;
  /** It is your everyday profile (remote debugging turned on for it), not one of the app's own. */
  everyday: boolean;
  name: string;
  version: string | null;
  tabs: DrivenTab[];
}
