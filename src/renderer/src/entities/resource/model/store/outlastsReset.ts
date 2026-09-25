import { RESOURCE_OP_OUTLASTS_RESET } from './resourceOpOutlastsReset';
import type { ResourceOpOf, ResourceOpType } from './types';

/** Whether a change still counts when a reset follows it. Generic so each op reaches its own check without a cast. */
export function outlastsReset<T extends ResourceOpType>(op: ResourceOpOf<T>): boolean {
  return RESOURCE_OP_OUTLASTS_RESET[op.type](op);
}
