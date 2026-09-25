import type { ResourceEntry } from '@common/types';
import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { isMappableKind } from '@/entities/source-map';
import { openResource } from '@/features/open-resource';
import type { BundleNest } from '../../lib';
import { sourceMapMenu } from './sourceMapMenu';

/** A file row's context menu. */
export function fileMenu(entry: ResourceEntry, nest: BundleNest | null): MenuItem[] {
  const { kind } = entry;
  return [
    { label: entry.overrideId ? 'Open override' : 'Open', icon: icons.FileIcon, onSelect: () => void openResource(entry.url) },
    ...(isMappableKind(kind) ? sourceMapMenu(entry.url, kind, nest) : []),
    { label: 'Copy URL', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(entry.url) },
    ...(entry.frame ? [{ label: 'Copy iframe URL', icon: icons.IframeIcon, onSelect: () => void navigator.clipboard.writeText(entry.frame!.url) }] : []),
  ];
}
