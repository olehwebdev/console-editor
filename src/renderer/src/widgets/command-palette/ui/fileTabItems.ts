import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import type { TabMeta } from '@/entities/editor-tab';
import { compareWithLive, toggleBaseDiff } from '@/features/compare-changes';
import { openInEditor } from '@/features/override/external-editor';
import { formatTab } from '@/features/format-document';
import { saveItem } from './saveItem';

/** The active file tab's commands: save, pretty-print, diff and, for an override, compare with the live file or open it in VS Code. */
export function fileTabItems(active: TabMeta | null): CommandItem[] {
  if (!active) return [];
  const { overrideId } = active;
  return [
    saveItem(active),
    { id: 'format', label: 'Pretty-print this file', icon: icons.PrettifyIcon, shortcut: SHORTCUT.format, onSelect: () => void formatTab() },
    { id: 'diff', label: 'Diff with where you started', icon: icons.DiffIcon, shortcut: SHORTCUT.diff, onSelect: toggleBaseDiff },
    ...(overrideId
      ? [
          { id: 'live', label: 'Compare with the live file', icon: icons.GlobeIcon, onSelect: () => void compareWithLive() },
          { id: 'open-in-editor', label: 'Open in VS Code', icon: icons.ExternalLinkIcon, keywords: ['external editor', 'edit'], onSelect: () => void openInEditor(overrideId) },
        ]
      : []),
  ];
}
