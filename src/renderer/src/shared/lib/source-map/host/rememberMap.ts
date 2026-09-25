import { MAX_RESIDENT_MAP_BYTES, MAX_RESIDENT_MAPS } from '../constants';
import type { LoadedMap, LoadedMaps } from './types';

/** Keeps a decoded map as the newest, dropping the least recently used beyond the budget (never the newest). */
export function rememberMap(maps: LoadedMaps, bundleUrl: string, entry: LoadedMap): void {
  maps.delete(bundleUrl);
  maps.set(bundleUrl, entry);
  let bytes = 0;
  for (const map of maps.values()) bytes += map.mapBytes;
  for (const [url, map] of maps) {
    if (maps.size === 1 || (maps.size <= MAX_RESIDENT_MAPS && bytes <= MAX_RESIDENT_MAP_BYTES)) break;
    maps.delete(url);
    bytes -= map.mapBytes;
  }
}
