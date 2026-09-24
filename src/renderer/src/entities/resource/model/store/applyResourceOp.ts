import type { ResourceEntry } from '@common/types';
import { RESOURCE_OP_APPLIERS } from './resourceOpAppliers';
import type { ResourceOpOf, ResourceOpType } from './types';

/** Applies one op to `apply`'s working copy and returns the entries after it. Generic so each op reaches its own applier without a cast. */
export function applyResourceOp<T extends ResourceOpType>(byKey: Record<string, ResourceEntry>, op: ResourceOpOf<T>): Record<string, ResourceEntry> {
  return RESOURCE_OP_APPLIERS[op.type](byKey, op);
}
