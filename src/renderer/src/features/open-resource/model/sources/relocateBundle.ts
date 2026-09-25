import type { SourceMapKind } from '@common/types';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { locateLocations } from './locateLocations';
import { nameHooksAt } from './nameHooksAt';
import { reloadSourceMap } from './reloadSourceMap';

/** A bundle's map changed (one loaded from a file, or forgotten): it is read again, and every place traced through it is traced again. */
export async function relocateBundle(bundleUrl: string, kind: SourceMapKind): Promise<void> {
  const named = new Set(Object.keys(useInspectorStore.getState().hookNames));
  const places = useInspectorStore.getState().forgetBundle(bundleUrl);
  await reloadSourceMap(bundleUrl, kind);
  await locateLocations(places);
  await Promise.all(places.filter((place) => named.has(locationKey(place))).map(nameHooksAt));
}
