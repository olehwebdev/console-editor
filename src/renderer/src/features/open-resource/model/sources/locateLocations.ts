import type { CodeLocation } from '@common/types';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { findOriginal } from './findOriginal';
import { flushOrigins } from './flushOrigins';
import { originLookups } from './originLookups';

/**
 * Looks up the original of each code location not known yet nor being looked up, and writes them together
 * (`flushOrigins`). One that couldn't be told now isn't written, so it is looked up again next time; one
 * that finishes after the maps were forgotten is dropped.
 */
export async function locateLocations(locations: readonly CodeLocation[]): Promise<void> {
  const known = useInspectorStore.getState().origins;
  const unknown = new Map<string, CodeLocation>();
  for (const location of locations) {
    const key = locationKey(location);
    if (!(key in known) && !originLookups.inFlight.has(key)) unknown.set(key, location);
  }
  for (const key of unknown.keys()) originLookups.inFlight.add(key);
  const generation = originLookups.generation;
  await Promise.all(
    [...unknown].map(async ([key, location]) => {
      const place = await findOriginal(location).catch(() => undefined);
      // The maps were forgotten meanwhile (another workspace): what this map said is gone with them.
      if (generation !== originLookups.generation) return;
      if (place === undefined) originLookups.inFlight.delete(key);
      else originLookups.found.set(key, place);
    }),
  );
  if (originLookups.found.size || originLookups.written) await flushOrigins();
}
