import type { WorkerType } from '../../../shared/types';
import { sessionTransport } from '../cdp';
import { TARGET_TYPE } from '../constants';
import { InterceptionEngine } from '../InterceptionEngine';
import { abortableTransport } from './abortableTransport';
import { resumeTarget } from './resumeTarget';
import { setUpWorker } from './setUpWorker';
import type { AttachedToTarget, ChildContext, ChildTarget } from './types';

/**
 * A worker was attached, paused (auto-attached, or a shared worker found by
 * discovery): one of a known session gets an engine of its own, set up as it
 * resumes; any other just runs, as does a service worker the app unregistered.
 */
export async function attachWorker(ctx: ChildContext, p: AttachedToTarget, parentSessionId: string | undefined): Promise<void> {
  const { cdp, children, serviceWorkers } = ctx;
  const { sessionId, targetInfo } = p;
  if (children.has(sessionId)) return;
  const parent = parentSessionId === undefined ? undefined : children.get(parentSessionId);
  const parentKnown = parentSessionId === undefined || !!parent;
  const type = targetInfo.type as WorkerType;
  const isServiceWorker = type === TARGET_TYPE.serviceWorker;
  if (ctx.stopped() || !parentKnown || (isServiceWorker && serviceWorkers.isRetired(targetInfo.targetId))) {
    await resumeTarget(cdp, sessionId);
    return;
  }

  // Registered synchronously, so a detach or fan-out racing the setup finds it.
  const { transport, gone } = abortableTransport(sessionTransport(cdp, sessionId));
  const worker = {
    id: sessionId,
    type,
    targetId: targetInfo.targetId,
    url: targetInfo.url,
    nested: parent?.type === TARGET_TYPE.worker,
    previous: isServiceWorker ? serviceWorkers.previous(targetInfo.targetId) : undefined,
  };
  const engine = new InterceptionEngine({ ...ctx.engineOptions, transport, worker });
  const depth = parent?.depth ?? 0;
  const child: ChildTarget = { sessionId, type, targetId: targetInfo.targetId, parentSessionId, depth, engine, transport, gone, dispose: [] };
  children.add(child);
  await setUpWorker(ctx, child, targetInfo);
}
