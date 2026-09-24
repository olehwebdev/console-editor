import type { MissedReason, WorkerType } from '../../../shared/types';
import type { MissContext } from './types';

/** Why a file a worker of each kind loaded wasn't served, where that's known. */
export const MISSED_REASONS: Record<WorkerType, (miss: MissContext) => MissedReason | undefined> = {
  worker: ({ nested, mainScript }) => (nested && mainScript ? 'nested-worker' : undefined),
  // Installing through its session pauses every script an override matches; one never paused there was
  // fetched by Chromium's update check, out of reach.
  service_worker: ({ pausedHere }) => (pausedHere ? undefined : 'service-worker-update'),
  shared_worker: () => undefined,
  worklet: () => undefined,
};
