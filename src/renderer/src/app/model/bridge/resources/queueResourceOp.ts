import type { ResourceOp } from '@/entities/resource';
import { HIDDEN_FLUSH_MS, NO_FRAME } from './constants';
import { flushResourceOps } from './flushResourceOps';
import { resourceQueue } from './resourceQueue';

/** Queues one change for the next flush: the next frame, or HIDDEN_FLUSH_MS while frames are paused. */
export function queueResourceOp(op: ResourceOp): void {
  resourceQueue.ops.push(op);
  if (resourceQueue.frame !== NO_FRAME) return;
  resourceQueue.frame = requestAnimationFrame(flushResourceOps);
  resourceQueue.timer = setTimeout(flushResourceOps, HIDDEN_FLUSH_MS);
}
