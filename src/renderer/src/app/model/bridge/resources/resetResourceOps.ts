import { outlastsReset } from '@/entities/resource';
import { RESET_RESOURCE_OP } from './constants';
import { queueResourceOp } from './queueResourceOp';
import { resourceQueue } from './resourceQueue';

/** Queues a top-level reset. It makes everything queued before it moot, except changes to the files it keeps (service and shared workers'). */
export function resetResourceOps(): void {
  resourceQueue.ops = resourceQueue.ops.filter(outlastsReset);
  queueResourceOp(RESET_RESOURCE_OP);
}
