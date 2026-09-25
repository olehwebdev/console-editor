import type { MissedReason } from '@common/types';
import type { MissedToast } from './types';

/** What an enabled override that wasn't served says, by why. Record<MissedReason, …>: a new reason fails typecheck until it has one. */
export const MISSED_TOASTS: Record<MissedReason, MissedToast> = {
  // No reload helps: Chromium pauses that script on no session. So it's said once per version of the override, not on every page load.
  'nested-worker': {
    title: (file) => `Your override can't apply to ${file}`,
    description: "Chromium doesn't let the app change the first script of a worker started by another worker. The files that worker loads still get your overrides.",
    reload: false,
    oncePerVersion: true,
  },
  'service-worker-update': {
    title: (file) => `The service worker reinstalled the live ${file}`,
    description:
      "Chromium's update check fetched it from the server, out of the app's reach. Reloading installs your version again. Keep Settings › Bypass service workers on: with it off, Chromium checks after every page load.",
    reload: true,
    oncePerVersion: false,
  },
};

/** Without a reason: the file was already loading, or was loaded on no session. */
export const UNEXPLAINED_MISS: MissedToast = {
  title: (file) => `Your override didn't apply to ${file}`,
  description: 'The page loaded the live file instead, e.g. it was already loading when the override was turned on. Reloading usually fixes it.',
  reload: true,
  oncePerVersion: false,
};
