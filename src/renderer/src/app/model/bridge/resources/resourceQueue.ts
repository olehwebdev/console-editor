import type { ResourceOp } from '@/entities/resource';
import { NO_FRAME } from './constants';

/**
 * Resource list changes, applied once per frame in the order they arrived: a
 * page load reports thousands of files, one message each, and every store
 * update rebuilds the resource tree. Mutated in place (importers can't
 * reassign another module's bindings).
 */
export const resourceQueue: { ops: ResourceOp[]; frame: number; timer: ReturnType<typeof setTimeout> | undefined } = {
  ops: [],
  frame: NO_FRAME,
  timer: undefined,
};
