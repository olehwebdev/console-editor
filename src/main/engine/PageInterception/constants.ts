import type { WorkerType } from '../../../shared/types';
import { TARGET_TYPE } from '../constants';
import type { WorkerSetup } from './types';

/**
 * Child targets are auto-attached paused, so an engine can be set up on each
 * before it loads anything: cross-site iframes (a separate process under site
 * isolation), dedicated workers, worklets and service workers.
 *
 * Every type Chromium pauses must be listed: with `waitForDebuggerOnStart`, a
 * dedicated worker or worklet left out of the filter is still paused but never
 * attached, so it never runs. Shared workers aren't auto-attached from a page
 * whatever the filter; they are found through target discovery.
 */
export const AUTO_ATTACH = {
  autoAttach: true,
  waitForDebuggerOnStart: true,
  flatten: true,
  filter: [
    { type: TARGET_TYPE.iframe },
    { type: TARGET_TYPE.worker },
    { type: TARGET_TYPE.worklet },
    { type: TARGET_TYPE.serviceWorker },
    { exclude: true },
  ],
} as const;

/**
 * Upper bound for setting up a child session (and for one fan-out step on it).
 * A paused iframe blocks its page, so after this we resume it regardless and
 * report that its first loads may bypass overrides.
 */
export const SETUP_TIMEOUT_MS = 5000;

/**
 * How long a shared worker's first script waits for the worker's session to
 * intercept (Chromium over a socket; in Electron it's set up at once).
 */
export const SHARED_WORKER_HOLD_MS = 2000;

/** Upper bound for asking an outdated service worker to unregister before a reload. */
export const UNREGISTER_TIMEOUT_MS = 2000;

/** Service workers whose state is kept after their session went away (the page may come back to them). */
export const KEPT_SERVICE_WORKERS = 50;

/** Reports the shared workers of every browser context as they are created (shared workers aren't auto-attached). */
export const DISCOVER_SHARED_WORKERS = { discover: true, filter: [{ type: TARGET_TYPE.sharedWorker }, { exclude: true }] };

/** Run in a service worker: asks it to unregister (when its registration's scope isn't known). */
export const UNREGISTER_EXPRESSION = 'self.registration.unregister()';

/** How each kind of worker's session is set up: a new kind fails typecheck until it's here. */
export const WORKER_SETUP: Record<WorkerType, WorkerSetup> = {
  worker: { name: 'worker', startsWorkers: true, inspector: false },
  shared_worker: { name: 'shared worker', startsWorkers: false, inspector: true },
  service_worker: { name: 'service worker', startsWorkers: false, inspector: true },
  worklet: { name: 'worklet', startsWorkers: false, inspector: false },
};
