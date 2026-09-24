import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { ResourceKind } from '@common/types';
import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import { fileName, hostOf, pathOf } from '@/shared/lib';
import { CommandPalette, type CommandGroup } from '@/shared/ui/command-palette';
import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { selectOverrideList, useOverrideStore } from '@/entities/override';
import { compareWithLive, toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { openPageDevTools, reloadPage } from '@/features/navigate-page';
import { openOverride, openResource } from '@/features/open-resource';
import { saveTab } from '@/features/save-override';
import { setOverrideEnabled } from '@/features/toggle-override';
import { usePageFiles } from '../model/files';
import { usePalette } from '../model/palette';

const KIND_ICON: Record<ResourceKind, (typeof icons)['JsIcon']> = { Script: icons.JsIcon, Stylesheet: icons.CssIcon, Document: icons.HtmlIcon };

export interface AppCommandPaletteProps {
  onShowSettings(): void;
  onFocusAddressBar(): void;
}

/** Ctrl/Cmd+K: jump to any file the page loaded or run a command. */
export function AppCommandPalette({ onShowSettings, onFocusAddressBar }: AppCommandPaletteProps) {
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const overrides = useOverrideStore(useShallow(selectOverrideList));
  const active = useTabStore(selectActiveTab);

  const resources = usePageFiles(open);
  const files = useMemo<CommandGroup>(
    () => ({
      heading: 'Page files',
      // Every file: the list is virtualized, so a page with thousands stays fast.
      items: resources.map((r) => ({
        id: r.url,
        label: fileName(r.url),
        hint: `${hostOf(r.url)}${pathOf(r.url)}${r.frame ? ' · iframe' : ''}`,
        icon: KIND_ICON[r.kind],
        keywords: [r.url, ...(r.frame ? ['iframe', r.frame.url] : [])],
        onSelect: () => void openResource(r.url),
      })),
    }),
    [resources],
  );

  const groups = useMemo<CommandGroup[]>(() => {
    if (!open) return [];
    const actions: CommandGroup = {
      heading: 'Actions',
      items: [
        ...(active
          ? [
              { id: 'save', label: active.overrideId ? 'Save override' : 'Create override from this file', icon: icons.SaveIcon, shortcut: ['mod', 'S'], onSelect: () => void saveTab() },
              { id: 'format', label: 'Pretty-print this file', icon: icons.PrettifyIcon, shortcut: ['shift', 'alt', 'F'], onSelect: () => void formatTab() },
              { id: 'diff', label: 'Diff with where you started', icon: icons.DiffIcon, shortcut: ['mod', 'shift', 'D'], onSelect: toggleBaseDiff },
              ...(active.overrideId ? [{ id: 'live', label: 'Compare with the live file', icon: icons.GlobeIcon, onSelect: () => void compareWithLive() }] : []),
            ]
          : []),
        { id: 'reload', label: 'Reload page', icon: icons.ReloadIcon, shortcut: ['mod', 'R'], onSelect: () => void reloadPage() },
        { id: 'url', label: 'Go to URL…', icon: icons.GlobeIcon, shortcut: ['mod', 'L'], onSelect: onFocusAddressBar },
        { id: 'devtools', label: 'Open DevTools for the page', icon: icons.DevToolsIcon, shortcut: ['mod', 'shift', 'J'], onSelect: () => void openPageDevTools() },
        { id: 'folder', label: 'Open the overrides folder', icon: icons.FolderIcon, onSelect: () => void api.revealOverridesFolder() },
        { id: 'settings', label: 'Settings', icon: icons.SettingsIcon, onSelect: onShowSettings },
      ],
    };
    const overrideGroup: CommandGroup = {
      heading: 'Overrides',
      items: overrides.flatMap((o) => [
        { id: `open-${o.id}`, label: fileName(o.sourceUrl), hint: hostOf(o.sourceUrl), icon: KIND_ICON[o.kind], keywords: [o.sourceUrl], onSelect: () => void openOverride(o.id) },
        {
          id: `toggle-${o.id}`,
          label: `${o.enabled ? 'Turn off' : 'Turn on'} override: ${fileName(o.sourceUrl)}`,
          icon: icons.LiveIcon,
          keywords: [o.sourceUrl, 'enable', 'disable'],
          onSelect: () => void setOverrideEnabled(o.id, !o.enabled),
        },
      ]),
    };
    return [files, overrideGroup, actions].filter((g) => g.items.length);
  }, [open, files, overrides, active, onShowSettings, onFocusAddressBar]);

  return <CommandPalette open={open} onOpenChange={setOpen} groups={groups} placeholder="Open a file, or type a command…" />;
}
