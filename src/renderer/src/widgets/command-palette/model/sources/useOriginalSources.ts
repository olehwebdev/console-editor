import { useMemo } from 'react';
import type { ResourceEntry, SourceMapKind } from '@common/types';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { isMappableKind, selectLoadedSources, useSourceMapStore } from '@/entities/source-map';
import { openOriginalSource } from '@/features/open-resource';
import { originalSourceItems } from '../files';

/** The palette's original files: those of loaded maps whose bundle the page (`resources`) still lists. */
export function useOriginalSources(resources: readonly ResourceEntry[]): CommandGroup {
  const loaded = useSourceMapStore(selectLoadedSources);
  return useMemo(() => {
    // Each opened with the kind the page lists its bundle as.
    const bundles = new Map<string, SourceMapKind>();
    for (const r of resources) if (isMappableKind(r.kind)) bundles.set(r.url, r.kind);
    return { heading: 'Original sources', items: originalSourceItems(loaded, bundles, (bundleUrl, kind, url) => void openOriginalSource(bundleUrl, kind, url)) };
  }, [resources, loaded]);
}
