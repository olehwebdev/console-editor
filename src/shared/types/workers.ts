/** Kinds of worker, as CDP names their targets. */
export type WorkerType = 'worker' | 'shared_worker' | 'service_worker' | 'worklet';

/**
 * Why an enabled override wasn't served. Without a reason, the file was
 * already loading or was loaded on no session: a reload usually fixes it.
 * - nested-worker: a worker started by another worker; Chromium lets no session change its first script.
 * - service-worker-update: Chromium's update check reinstalled the service worker from the server,
 *   out of the app's reach.
 */
export type MissedReason = 'nested-worker' | 'service-worker-update';
