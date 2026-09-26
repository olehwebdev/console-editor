import type { SwitchSetting, Throttling } from '@common/types';

/** Human labels for each on/off setting, in display order. */
export const SETTING_META: Array<{ key: SwitchSetting; label: string; help: string }> = [
  { key: 'autoReloadOnSave', label: 'Reload page after changes', help: 'Reload the page after saving, enabling or deleting an override or a rule.' },
  { key: 'autoFormatMinified', label: 'Pretty-print minified files', help: 'Format minified JS/CSS/HTML when you open them.' },
  { key: 'stripIntegrity', label: 'Strip integrity checks (SRI)', help: 'Otherwise the browser refuses edited files loaded with integrity="…".' },
  { key: 'stripSourceMaps', label: 'Strip source maps from overrides', help: 'Edited files no longer line up with their source maps.' },
  { key: 'disableCache', label: 'Disable HTTP cache', help: 'Every load goes to the network, so overrides always apply.' },
  { key: 'bypassServiceWorker', label: 'Bypass service workers', help: 'Otherwise service workers can answer from their cache, and Chromium checks them for updates after every page load, which can undo edits to their scripts.' },
  { key: 'bypassCSP', label: 'Bypass Content-Security-Policy', help: 'Allow eval/inline code in patches on sites with a strict CSP.' },
  { key: 'captureConsole', label: 'Record the console', help: 'Logs and errors from the page and all its frames. Turn it off for a site that acts differently while it is on.' },
  { key: 'frameworkHooks', label: 'Framework hooks', help: 'Let React tell which version a frame runs, through a stand-in for its DevTools hook put in every page before its scripts. Takes effect on the next load.' },
  { key: 'checkForUpdates', label: 'Check for updates', help: 'Look for a new release on GitHub at start and every few hours.' },
];

/** How each network speed reads. */
export const THROTTLING_LABELS: Record<Throttling, string> = {
  off: 'No throttling',
  'fast-4g': 'Fast 4G',
  'slow-4g': 'Slow 4G',
  '3g': '3G',
  offline: 'Offline',
};
