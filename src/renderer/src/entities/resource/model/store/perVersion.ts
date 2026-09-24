import type { ResourceEntry } from '@common/types';
import type { ResourceStore } from './types';

/** Derives a value once per `byKey` object (replaced on every change), so selectors return stable results. */
export function perVersion<T>(derive: (byKey: Record<string, ResourceEntry>) => T): (s: ResourceStore) => T {
  const cache = new WeakMap<Record<string, ResourceEntry>, T>();
  return (s) => {
    if (!cache.has(s.byKey)) cache.set(s.byKey, derive(s.byKey));
    return cache.get(s.byKey)!;
  };
}
