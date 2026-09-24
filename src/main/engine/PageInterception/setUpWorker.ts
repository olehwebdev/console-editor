import type { WorkerType } from '../../../shared/types';
import { CDP, TARGET_TYPE } from '../constants';
import { AUTO_ATTACH, SETUP_TIMEOUT_MS, WORKER_SETUP } from './constants';
import { resumeTarget } from './resumeTarget';
import { SessionGoneError } from './SessionGoneError';
import type { ChildContext, ChildTarget, TargetInfo } from './types';
import { withTimeout } from './withTimeout';

/**
 * Sets a worker up and resumes it at once. Everything is sent before the
 * resume and nothing is awaited first: a waiting service or shared worker
 * answers Network commands only once it runs, while Fetch must be on (and
 * Network enabled, to report the worker's first script) before it does. A
 * service worker's Fetch must even go out in this same task: an installed
 * one starting on a new session fetches right away.
 */
export async function setUpWorker(ctx: ChildContext, child: ChildTarget, targetInfo: TargetInfo): Promise<void> {
  const { cdp, opts, children, sharedWorkers } = ctx;
  const { sessionId, engine, transport } = child;
  const type = child.type as WorkerType;
  const setup = WORKER_SETUP[type];
  const replies: Array<Promise<unknown>> = [engine.attach()];
  // Workers this worker starts attach through its session (else they'd never run).
  if (setup.startsWorkers) replies.push(transport.send(CDP.Target.setAutoAttach, { ...AUTO_ATTACH }));
  if (setup.inspector) {
    replies.push(transport.send(CDP.Inspector.enable));
    child.dispose.push(
      // A stopped worker that starts again waits for the debugger, on the same session.
      transport.on(CDP.Inspector.targetReloadedAfterCrash, () => void resumeTarget(cdp, sessionId)),
      // A shared worker ends with its last page; its next instance is found anew and attached before it starts.
      transport.on(CDP.Inspector.targetCrashed, () => {
        if (type === TARGET_TYPE.sharedWorker) cdp.send(CDP.Target.detachFromTarget, { sessionId }).catch(() => undefined);
      }),
    );
  }
  if (type === TARGET_TYPE.sharedWorker) void engine.fetchReady.catch(() => undefined).then(() => sharedWorkers.settle(targetInfo.targetId));
  void resumeTarget(cdp, sessionId);

  const all = Promise.all(replies);
  all.catch(() => undefined);
  try {
    // Only Fetch decides whether overrides apply here; dedicated workers are served on their frame's session.
    await withTimeout(engine.fetchReady, SETUP_TIMEOUT_MS, `Setting up the ${setup.name}`);
  } catch (err) {
    if (children.isLive(child) && !(err instanceof SessionGoneError)) {
      opts.emit({ type: 'error', message: `Overrides may not apply inside ${setup.name} ${targetInfo.url || targetInfo.targetId}: ${(err as Error).message}` });
    }
  }
  await withTimeout(all, SETUP_TIMEOUT_MS, 'Setting up the worker').catch(() => undefined);
  // In case a command held the worker back.
  if (children.isLive(child)) await resumeTarget(cdp, sessionId);
}
