import type { LoadedSource, SourceMapState, SourceMapStore } from './types';

const cache = new WeakMap<Record<string, SourceMapState>, readonly LoadedSource[]>();

/** Every source of every ready map; derived once per `byBundle` object, so the reference is stable. */
export function selectLoadedSources(s: SourceMapStore): readonly LoadedSource[] {
  let loaded = cache.get(s.byBundle);
  if (!loaded) {
    loaded = Object.entries(s.byBundle).flatMap(([bundleUrl, state]) =>
      state.status === 'ready' ? state.sources.map((source) => ({ bundleUrl, source })) : [],
    );
    cache.set(s.byBundle, loaded);
  }
  return loaded;
}
