import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { exportOverrides, importOverrides } from '@/features/override/share';

/** Keywords for sharing overrides as a file. */
const SHARE_KEYWORDS = ['share', 'teammate', 'file', 'json'];

/** The workspace's override files: their folder, exporting them with its rules (when it has any) as one file, and importing one. */
export function overrideFileItems(hasAny: boolean): CommandItem[] {
  return [
    { id: 'folder', label: 'Open the overrides folder', icon: icons.FolderIcon, onSelect: () => void api.revealOverridesFolder() },
    ...(hasAny ? [{ id: 'overrides-export', label: 'Export overrides and rules…', icon: icons.ExportIcon, keywords: SHARE_KEYWORDS, onSelect: () => void exportOverrides() }] : []),
    { id: 'overrides-import', label: 'Import overrides and rules…', icon: icons.ImportIcon, keywords: SHARE_KEYWORDS, onSelect: () => void importOverrides() },
  ];
}
