import type { SourceMapState } from '@/entities/source-map';

/**
 * Loads in flight, by bundle URL. A load stores its result only while it is still the one listed
 * here, so forgetting the maps (a workspace switch) or a newer load wins. Mutated in place.
 */
export const sourceMapLoads: { loads: Map<string, Promise<SourceMapState>> } = { loads: new Map() };
