import type { OriginalPlace } from '@/entities/inspector';

/**
 * Originals being looked up (by `locationKey`), and those found, waiting to be written together
 * (`flushOrigins`), with the promise of that write. `generation` goes up as the maps are forgotten
 * (`forgetSourceMaps`): a lookup started before drops what it finds. Mutated in place.
 */
export const originLookups: { inFlight: Set<string>; found: Map<string, OriginalPlace | null>; written: Promise<void> | null; generation: number } = {
  inFlight: new Set(),
  found: new Map(),
  written: null,
  generation: 0,
};
