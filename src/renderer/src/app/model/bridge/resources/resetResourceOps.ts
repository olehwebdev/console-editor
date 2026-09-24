import { RESET_RESOURCE_OP } from './constants';
import { queueResourceOp } from './queueResourceOp';
import { resourceQueue } from './resourceQueue';

/** Queues a top-level reset. It makes everything queued before it moot. */
export function resetResourceOps(): void {
  resourceQueue.ops = [];
  queueResourceOp(RESET_RESOURCE_OP);
}
