import type { ResourceEntry, WorkerType } from '@common/types';

/**
 * A service or shared worker outlives the page that started it, so its files
 * stay listed across navigations (the main process drops them with
 * `worker-detached`). A dedicated worker or a worklet goes with its page.
 * Record<WorkerType, …>: a new kind of worker fails typecheck until it has a row here.
 */
const OUTLIVES_PAGE: Record<WorkerType, boolean> = { worker: false, shared_worker: true, service_worker: true, worklet: false };

/** Whether an entry stays listed through a top-level navigation. */
export function outlivesPage(entry: ResourceEntry): boolean {
  return !!(entry.worker && OUTLIVES_PAGE[entry.worker.type]);
}
