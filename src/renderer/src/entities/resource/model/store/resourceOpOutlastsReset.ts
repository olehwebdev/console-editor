import { outlivesPage } from './outlivesPage';
import type { ResourceOpChecks } from './types';

/**
 * Whether each op, queued before a reset, still counts after it. Annotated
 * rather than `satisfies`: `outlastsReset`'s generic lookup needs the mapped type.
 */
export const RESOURCE_OP_OUTLASTS_RESET: ResourceOpChecks = {
  add: (op) => outlivesPage(op.entry),
  reset: () => false,
  'drop-iframe': () => false,
  // What it drops may be files the reset keeps.
  'drop-worker': () => true,
};
