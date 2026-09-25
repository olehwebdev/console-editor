import type { LoadedMap, LoadedMaps } from './types';

/** A bundle's decoded map, now the most recently used. */
export function loadedMap(maps: LoadedMaps, bundleUrl: string): LoadedMap | undefined {
  const entry = maps.get(bundleUrl);
  if (entry) {
    maps.delete(bundleUrl);
    maps.set(bundleUrl, entry);
  }
  return entry;
}
