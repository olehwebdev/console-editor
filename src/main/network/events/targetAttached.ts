import { WORKER_TARGETS } from '../constants';
import type { NetworkLogContext } from '../types';

/** `Target.attachedToTarget`: a worker's session, whose requests are labelled with the worker. */
export function targetAttached({ workers }: NetworkLogContext, p: { sessionId: string; targetInfo: { type: string; url: string } }): void {
  const type = WORKER_TARGETS.get(p.targetInfo.type);
  if (type) workers.set(p.sessionId, { type, url: p.targetInfo.url });
}
