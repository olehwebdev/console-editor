import { matchesSource, type SourceMapState } from '@/entities/source-map';

/** Bundles whose loaded originals the filter matches (it never loads a map). */
export function bundlesMatching(byBundle: Record<string, SourceMapState>, query: string): ReadonlySet<string> {
  const matching = new Set<string>();
  if (!query) return matching;
  for (const [bundleUrl, state] of Object.entries(byBundle)) {
    if (state.status === 'ready' && state.sources.some((source) => matchesSource(source.url, query))) matching.add(bundleUrl);
  }
  return matching;
}
