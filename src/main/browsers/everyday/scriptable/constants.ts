/**
 * The macOS browsers whose tabs scripting reaches (JavaScript for Automation), by app name, with what their tabs call
 * a title: Safari's `name`, Chromium's `title`. Firefox has no tabs to script (its session file is read instead).
 */
export const SCRIPTABLE_APPS: Readonly<Record<string, string>> = {
  Safari: 'name',
  'Safari Technology Preview': 'name',
  'Google Chrome': 'title',
  'Google Chrome Beta': 'title',
  'Google Chrome Dev': 'title',
  'Google Chrome Canary': 'title',
  Chromium: 'title',
  'Microsoft Edge': 'title',
  'Microsoft Edge Beta': 'title',
  'Microsoft Edge Dev': 'title',
  'Microsoft Edge Canary': 'title',
  'Brave Browser': 'title',
  'Brave Browser Beta': 'title',
  'Brave Browser Nightly': 'title',
  Vivaldi: 'title',
  Arc: 'title',
};

/** The system that has it, and an app bundle's extension. */
export const SCRIPTING_PLATFORM = 'darwin';
export const APP_BUNDLE = '.app';

/** Runs a script as JavaScript for Automation: `osascript -l JavaScript -e <script>`. */
export const OSASCRIPT = 'osascript';
export const JXA_FLAGS = ['-l', 'JavaScript', '-e'] as const;

/** How long reading the tabs may take: macOS may first ask whether the app may control the browser. */
export const SCRIPT_TIMEOUT_MS = 60_000;

/** The error macOS gives when the app isn't allowed to control the browser (System Settings › Privacy & Security › Automation). */
export const NOT_ALLOWED_ERROR = '-1743';
