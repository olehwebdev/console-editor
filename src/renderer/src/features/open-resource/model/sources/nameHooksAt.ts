import type { CodeLocation } from '@common/types';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { askLoadedMap } from './askLoadedMap';
import { SCRIPT_KIND } from './constants';
import { isMiss } from './isMiss';
import { originLookups } from './originLookups';

/** Reads the hook names of the React component defined at a place off its original, once that original is known (`locateLocations`). */
export async function nameHooksAt(location: CodeLocation): Promise<void> {
  const { origins, hookNames, setHookNames } = useInspectorStore.getState();
  const place = origins[locationKey(location)];
  if (!place || locationKey(location) in hookNames) return;
  const generation = originLookups.generation;
  const reply = await askLoadedMap({ type: 'hookNames', bundleUrl: place.bundleUrl, url: place.url, line: place.line, column: place.column }, { kind: SCRIPT_KIND }).catch(() => null);
  // Not once the maps were forgotten meanwhile (another workspace).
  if (reply && !isMiss(reply) && generation === originLookups.generation) setHookNames(locationKey(location), reply.names);
}
