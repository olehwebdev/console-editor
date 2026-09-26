import type { ComponentTreeLevel } from '@common/types';
import { nodeLocations } from '@/entities/inspector';
import { locateLocations } from '@/features/open-resource';

/** Looks up where the components of levels just read come from, so the tree names them as their originals do. */
export function nameLevels(levels: readonly ComponentTreeLevel[]): Promise<void> {
  return locateLocations(nodeLocations(levels));
}
