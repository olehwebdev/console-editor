import type { SourceMapKind } from '@common/types';
import { fileName } from '@/shared/lib';
import type { CommandItem } from '@/shared/ui/command-palette';
import { parseSourceUrl, sourceGlyph, sourceKey, type LoadedSource } from '@/entities/source-map';
import { PALETTE_SOURCE_LIMIT, SOURCE_ITEM_PREFIX } from './constants';

/**
 * Palette items for the originals of loaded maps whose bundle the page lists (`bundles`, by URL, with
 * its kind), each opened with `open`. Library code is left out; at most PALETTE_SOURCE_LIMIT.
 */
export function originalSourceItems(
  loaded: readonly LoadedSource[],
  bundles: ReadonlyMap<string, SourceMapKind>,
  open: (bundleUrl: string, kind: SourceMapKind, url: string) => void,
): CommandItem[] {
  const items: CommandItem[] = [];
  for (const { bundleUrl, source } of loaded) {
    const kind = bundles.get(bundleUrl);
    if (!kind || source.library) continue;
    if (items.length === PALETTE_SOURCE_LIMIT) break;
    const { dirs, file } = parseSourceUrl(source.url);
    const bundle = fileName(bundleUrl);
    items.push({
      id: SOURCE_ITEM_PREFIX + sourceKey(bundleUrl, source.url),
      label: file,
      hint: [...(dirs.length ? [dirs.join('/')] : []), bundle].join(' · '),
      icon: sourceGlyph(file).icon,
      keywords: [source.url, bundle],
      onSelect: () => open(bundleUrl, kind, source.url),
    });
  }
  return items;
}
