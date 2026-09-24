import type { ResourceEntry } from '@common/types';
import { outlivesPage } from './outlivesPage';
import { resourceKey } from './resourceKey';
import type { ResourceOpAppliers } from './types';

/**
 * What each op does to `apply`'s working copy of the entries: changes it in
 * place (a page load reports thousands of files, too many to copy for each),
 * or, for a reset, starts a new one with what it keeps. Annotated rather than
 * `satisfies`: `applyResourceOp`'s generic lookup needs the mapped type.
 */
export const RESOURCE_OP_APPLIERS: ResourceOpAppliers = {
  add: (byKey, op) => {
    byKey[resourceKey(op.entry)] = op.entry;
    return byKey;
  },
  reset: (byKey) => {
    const kept: Record<string, ResourceEntry> = {};
    for (const key in byKey) if (outlivesPage(byKey[key])) kept[key] = byKey[key];
    return kept;
  },
  'drop-iframe': (byKey, op) => {
    for (const key in byKey) if (byKey[key].iframeId === op.iframeId) delete byKey[key];
    return byKey;
  },
  'drop-worker': (byKey, op) => {
    for (const key in byKey) if (byKey[key].workerId === op.workerId) delete byKey[key];
    return byKey;
  },
};
