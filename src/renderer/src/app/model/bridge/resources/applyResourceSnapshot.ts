import type { ResourceEntry } from '@common/types';
import { useResourceStore } from '@/entities/resource';
import { flushResourceOps } from './flushResourceOps';

/** The main process's list, as of its reply: events queued before the reply are older, so they go first. */
export function applyResourceSnapshot(resources: ResourceEntry[]): void {
  flushResourceOps();
  useResourceStore.getState().addMany(resources);
}
