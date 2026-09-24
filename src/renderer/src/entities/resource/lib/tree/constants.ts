import type { WorkerType } from '@common/types';

/** The scheme a web URL starts with, left out of labels. */
export const WEB_SCHEME = /^https?:\/\//;

/** How the UI names each kind of worker. */
export const WORKER_NAME: Record<WorkerType, string> = {
  worker: 'worker',
  shared_worker: 'shared worker',
  service_worker: 'service worker',
  worklet: 'worklet',
};
