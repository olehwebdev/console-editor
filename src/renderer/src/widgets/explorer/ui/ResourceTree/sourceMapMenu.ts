import type { SourceMapKind } from '@common/types';
import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { reloadSourceMap, revealBundleSources } from '@/features/open-resource';
import type { BundleNest } from '../../lib';

/** A bundle row's source-map actions: look for one it has none, otherwise show, reload or copy it. */
export function sourceMapMenu(bundleUrl: string, kind: SourceMapKind, nest: BundleNest | null): MenuItem[] {
  if (!nest) return [{ label: 'Look for a source map', icon: icons.SearchIcon, onSelect: () => void reloadSourceMap(bundleUrl, kind) }];
  const { mapUrl } = nest;
  return [
    { label: 'Show original sources', icon: icons.SourceRootIcon, onSelect: () => void revealBundleSources(bundleUrl, kind) },
    ...(nest.status === 'ready' || nest.status === 'failed' ? [{ label: 'Reload source map', icon: icons.ReloadIcon, onSelect: () => void reloadSourceMap(bundleUrl, kind) }] : []),
    ...(mapUrl ? [{ label: 'Copy source map URL', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(mapUrl) }] : []),
  ];
}
