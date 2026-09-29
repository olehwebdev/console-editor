/** The file Firefox writes in its profile once its WebDriver BiDi server listens: `{ "ws_host", "ws_port" }`. */
export const BIDI_PORT_FILE = 'WebDriverBiDiServer.json';

/** A BiDi session's path on that server. */
export const SESSION_PATH = '/session';

/**
 * What Firefox started to be driven is given: its profile (the folder follows the flag), its own instance, and a
 * debugging port the system picks.
 */
export const PROFILE_FLAG = '--profile';
export const FIREFOX_FLAGS = ['--no-remote', '--new-instance', '--remote-debugging-port=0'] as const;

/** The preferences file of a Firefox profile, read at each start. */
export const USER_PREFS_FILE = 'user.js';

/** A driven Firefox's preferences: no first-run pages, no default-browser question, no data reporting. */
export const FIREFOX_PREFS: ReadonlyArray<readonly [string, string | boolean]> = [
  ['browser.shell.checkDefaultBrowser', false],
  ['browser.startup.homepage_override.mstone', 'ignore'],
  ['browser.aboutwelcome.enabled', false],
  ['datareporting.policy.dataSubmissionEnabled', false],
  ['toolkit.telemetry.reportingpolicy.firstRun', false],
  ['browser.tabs.warnOnClose', false],
];

/** A tab's title, and its window (CSS pixels), density and document size, read in its page (the latter as JSON). */
export const TITLE_EXPRESSION = 'document.title';
export const METRICS_EXPRESSION = 'JSON.stringify([innerWidth, innerHeight, devicePixelRatio, document.documentElement.scrollWidth, document.documentElement.scrollHeight])';

/** What a capture of each area is taken relative to, and the type of a box clipped out of it. */
export const SCREENSHOT_ORIGIN = { viewport: 'viewport', page: 'document' } as const;
export const CLIP_BOX = 'box';

/** A new top-level context's type. */
export const TAB_TYPE = 'tab';

/** How far `navigate` waits: not at all (opening a tab), or until the page has loaded (capturing it). */
export const NAVIGATE_WAIT = { none: 'none', loaded: 'complete' } as const;

/** A tab's window height, asked of its page to keep it while its width is a design's. */
export const HEIGHT_EXPRESSION = 'String(innerHeight)';
