import { relistPrevious } from './relistPrevious';
import type { WorkerSessionContext } from './types';
import { watchWorker } from './watchWorker';

/**
 * Sets up a worker session: follows how it gets its first script, lists again
 * what a service worker attached anew loaded before, and sends its setup at
 * once, without awaiting it (see `WorkerSettingsApplier.start`).
 */
export function attachWorkerSession({ cdp, resources, worker, settings, disposers }: WorkerSessionContext): Promise<void> {
  disposers.push(...watchWorker(cdp, resources, worker));
  relistPrevious(resources, worker);
  return settings.start();
}
