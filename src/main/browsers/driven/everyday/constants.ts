/**
 * Where each Chromium browser keeps its everyday profile, by the words its name or program has (first match first):
 * under `~/.config` on Linux, `~/Library/Application Support` on macOS, `%LOCALAPPDATA%` on Windows. With remote
 * debugging turned on for it (Chrome 144's chrome://inspect/#remote-debugging), it writes its address there.
 */
export const EVERYDAY_PROFILES: ReadonlyArray<{ pattern: RegExp; linux: string; darwin: string; win32: string }> = [
  { pattern: /chrome.*beta/i, linux: 'google-chrome-beta', darwin: 'Google/Chrome Beta', win32: 'Google/Chrome Beta/User Data' },
  { pattern: /chrome.*(unstable|dev)/i, linux: 'google-chrome-unstable', darwin: 'Google/Chrome Dev', win32: 'Google/Chrome Dev/User Data' },
  { pattern: /canary/i, linux: 'google-chrome-canary', darwin: 'Google/Chrome Canary', win32: 'Google/Chrome SxS/User Data' },
  { pattern: /chromium/i, linux: 'chromium', darwin: 'Chromium', win32: 'Chromium/User Data' },
  { pattern: /chrome/i, linux: 'google-chrome', darwin: 'Google/Chrome', win32: 'Google/Chrome/User Data' },
  { pattern: /edge/i, linux: 'microsoft-edge', darwin: 'Microsoft Edge', win32: 'Microsoft/Edge/User Data' },
  { pattern: /brave/i, linux: 'BraveSoftware/Brave-Browser', darwin: 'BraveSoftware/Brave-Browser', win32: 'BraveSoftware/Brave-Browser/User Data' },
  { pattern: /vivaldi/i, linux: 'vivaldi', darwin: 'Vivaldi', win32: 'Vivaldi/User Data' },
  { pattern: /opera/i, linux: 'opera', darwin: 'com.operasoftware.Opera', win32: 'Opera Software/Opera Stable' },
  { pattern: /\barc\b/i, linux: 'arc', darwin: 'Arc/User Data', win32: 'Arc/User Data' },
];

/** Each system's folder of profiles, from the home folder (Windows: its local app data). */
export const PROFILES_ROOT: Partial<Record<NodeJS.Platform, string>> = { linux: '.config', darwin: 'Library/Application Support', win32: 'AppData/Local' };

/** Where a Snap's (`~/snap/<name>/common/<profile>`) and a Flatpak's (`~/.var/app/<app id>/config/<profile>`) everyday profiles are. */
export const SANDBOXED_PROFILES = { snapCommon: 'common', flatpakData: '.var/app', flatpakConfig: 'config' } as const;

/** How long a debugging port gets to take a connection before it counts as closed (the file can outlive the browser). */
export const LISTENING_TIMEOUT_MS = 500;

/** How long connecting may take: Chrome asks you to allow it first. */
export const ALLOW_TIMEOUT_MS = 60_000;

/** A driven everyday browser's key, and its name, beside the installed browser's. */
export const EVERYDAY_KEY_SUFFIX = '#everyday';
export const EVERYDAY_NAME_SUFFIX = ' · your profile';
