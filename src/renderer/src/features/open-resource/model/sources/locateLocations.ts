import type { CodeLocation } from '@common/types';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { findOriginal } from './findOriginal';

/** Looks up the original of each code location not known yet, keeping each as it comes. */
export async function locateLocations(locations: readonly CodeLocation[]): Promise<void> {
  const known = useInspectorStore.getState().origins;
  const unknown = [...new Map(locations.filter((location) => !(locationKey(location) in known)).map((location) => [locationKey(location), location])).values()];
  await Promise.all(
    unknown.map(async (location) => {
      const place = await findOriginal(location).catch(() => null);
      useInspectorStore.getState().setOrigin(locationKey(location), place);
    }),
  );
}
