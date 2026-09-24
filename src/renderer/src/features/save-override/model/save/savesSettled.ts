import { jobs } from './jobs';

/** Resolves once the saves running now, and those queued behind them, have finished. */
export function savesSettled(): Promise<void> {
  return Promise.allSettled([...jobs.values()].map((job) => job.next ?? job.task)).then(() => undefined);
}
