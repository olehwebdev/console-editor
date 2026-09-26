import type { CodeLocation, ComponentTreeLevel } from '@common/types';

/** Where the components of some tree levels are defined, for looking up their originals' names. */
export function nodeLocations(levels: readonly ComponentTreeLevel[]): CodeLocation[] {
  return levels.flatMap((level) => level.nodes.flatMap((node) => (node.location ? [node.location] : [])));
}
