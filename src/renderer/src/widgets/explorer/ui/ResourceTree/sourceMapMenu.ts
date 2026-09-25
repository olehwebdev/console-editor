import type { SourceMapKind } from '@common/types';
import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { forgetMapFile, loadMapFile, reloadSourceMap, revealBundleSources } from '@/features/open-resource';
import type { BundleNest } from '../../lib';

/**
 * A bundle row's source-map actions: look for one it has none, otherwise show, reload or copy it; load one
 * from a file (a map the site doesn't publish), or forget one loaded so.
 */
export function sourceMapMenu(bundleUrl: string, kind: SourceMapKind, nest: BundleNest | null): MenuItem[] {
  const fromFile: MenuItem[] = [
    { label: 'Load a source map from a file…', icon: icons.FolderIcon, onSelect: () => void loadMapFile(bundleUrl, kind) },
    ...(nest?.file ? [{ label: `Forget ${nest.file}`, icon: icons.CloseIcon, onSelect: () => void forgetMapFile(bundleUrl, kind) }] : []),
  ];
  if (!nest) return [{ label: 'Look for a source map', icon: icons.SearchIcon, onSelect: () => void reloadSourceMap(bundleUrl, kind) }, ...fromFile];
  const { mapUrl } = nest;
  return [
    { label: 'Show original sources', icon: icons.SourceRootIcon, onSelect: () => void revealBundleSources(bundleUrl, kind) },
    ...(nest.status === 'ready' || nest.status === 'failed' ? [{ label: 'Reload source map', icon: icons.ReloadIcon, onSelect: () => void reloadSourceMap(bundleUrl, kind) }] : []),
    ...(mapUrl ? [{ label: 'Copy source map URL', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(mapUrl) }] : []),
    ...fromFile,
  ];
}
