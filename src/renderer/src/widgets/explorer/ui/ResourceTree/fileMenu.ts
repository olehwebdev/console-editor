import type { ResourceEntry } from '@common/types';
import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { openResource } from '@/features/open-resource';
import { ruleMenuItems } from './ruleMenuItems';

/** A file row's context menu: opening and copying, then its rule actions. */
export function fileMenu(entry: ResourceEntry): MenuItem[] {
  return [
    { label: entry.overrideId ? 'Open override' : 'Open', icon: icons.FileIcon, onSelect: () => void openResource(entry.url) },
    { label: 'Copy URL', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(entry.url) },
    ...(entry.frame ? [{ label: 'Copy iframe URL', icon: icons.IframeIcon, onSelect: () => void navigator.clipboard.writeText(entry.frame!.url) }] : []),
    { separator: true },
    ...ruleMenuItems(entry),
  ];
}
