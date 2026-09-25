import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SHORTCUT } from '@common/constants';
import type { ResourceKind, SourceMapKind } from '@common/types';
import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import { fileName, hostOf, pathOf } from '@/shared/lib';
import { CommandPalette, type CommandGroup } from '@/shared/ui/command-palette';
import { selectActiveSource, selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { selectOverrideList, useOverrideStore } from '@/entities/override';
import { isMappableKind, selectLoadedSources, useSourceMapStore } from '@/entities/source-map';
import { useWorkspaceStore, workspaceDetail, workspaceLabel } from '@/entities/workspace';
import { compareWithLive, toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { openPageDevTools, reloadPage } from '@/features/navigate-page';
import { bundleUrlOf, goToBundle, goToOriginal, openOriginalSource, openOverride, openResource, revealBundleSources } from '@/features/open-resource';
import { saveTab } from '@/features/save-override';
import { setOverrideEnabled } from '@/features/toggle-override';
import { checkForUpdatesNow, openWhatsNew } from '@/features/update-app';
import { originalSourceItems, usePageFiles } from '../model/files';
import { usePalette } from '../model/palette';

const KIND_ICON: Record<ResourceKind, (typeof icons)['JsIcon']> = { Script: icons.JsIcon, Stylesheet: icons.CssIcon, Document: icons.HtmlIcon };

/** An override has two items: their ids are one of these prefixes and its id. */
const OVERRIDE_ITEM_PREFIX = { open: 'open-', toggle: 'toggle-' } as const;
/** A workspace's item id: this prefix and its id. */
const WORKSPACE_ITEM_PREFIX = 'workspace-';

export interface AppCommandPaletteProps {
  onShowSettings(): void;
  /** Shows the Explorer sidebar, filter cleared. */
  onShowExplorer(): void;
  onFocusAddressBar(): void;
  onSwitchWorkspace(id: string): void;
  onNewWorkspace(): void;
}

/** Ctrl/Cmd+K: jump to any file the page loaded or original of a loaded map, switch workspaces or run a command. */
export function AppCommandPalette({ onShowSettings, onShowExplorer, onFocusAddressBar, onSwitchWorkspace, onNewWorkspace }: AppCommandPaletteProps) {
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const overrides = useOverrideStore(useShallow(selectOverrideList));
  const active = useTabStore(selectActiveTab);
  const activeSource = useTabStore(selectActiveSource);
  const loaded = useSourceMapStore(selectLoadedSources);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeId);

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
  const sources = useMemo<CommandGroup>(() => {
    // Only originals of bundles the page still lists, opened with the kind it lists them as.
    const bundles = new Map<string, SourceMapKind>();
    for (const r of resources) if (isMappableKind(r.kind)) bundles.set(r.url, r.kind);
    return { heading: 'Original sources', items: originalSourceItems(loaded, bundles, (bundleUrl, kind, url) => void openOriginalSource(bundleUrl, kind, url)) };
  }, [resources, loaded]);

  const groups = useMemo<CommandGroup[]>(() => {
    if (!open) return [];
    const showSources = (bundleUrl: string, kind: SourceMapKind) => {
      void revealBundleSources(bundleUrl, kind);
      onShowExplorer();
    };
    const jumpFromBundle = (kind: SourceMapKind, bundleUrl: string) => [
      { id: 'go-to-original', label: 'Go to original source', icon: icons.JumpIcon, shortcut: SHORTCUT.jumpToMapped, onSelect: () => void goToOriginal() },
      { id: 'show-sources', label: 'Show original sources in the Explorer', icon: icons.SourceRootIcon, onSelect: () => showSources(bundleUrl, kind) },
    ];
    const actions: CommandGroup = {
      heading: 'Actions',
      items: [
        ...(active
          ? [
              { id: 'save', label: active.overrideId ? 'Save override' : 'Create override from this file', icon: icons.SaveIcon, shortcut: SHORTCUT.save, onSelect: () => void saveTab() },
              { id: 'format', label: 'Pretty-print this file', icon: icons.PrettifyIcon, shortcut: SHORTCUT.format, onSelect: () => void formatTab() },
              { id: 'diff', label: 'Diff with where you started', icon: icons.DiffIcon, shortcut: SHORTCUT.diff, onSelect: toggleBaseDiff },
              ...(active.overrideId ? [{ id: 'live', label: 'Compare with the live file', icon: icons.GlobeIcon, onSelect: () => void compareWithLive() }] : []),
            ]
          : []),
        ...(active && isMappableKind(active.kind) ? jumpFromBundle(active.kind, bundleUrlOf(active)) : []),
        ...(activeSource
          ? [
              { id: 'go-to-bundle', label: 'Go to bundle code', icon: icons.JumpIcon, shortcut: SHORTCUT.jumpToMapped, onSelect: () => void goToBundle() },
              { id: 'show-source', label: 'Show in the Explorer', icon: icons.SourceRootIcon, onSelect: () => showSources(activeSource.bundleUrl, activeSource.bundleKind) },
            ]
          : []),
        { id: 'reload', label: 'Reload page', icon: icons.ReloadIcon, shortcut: SHORTCUT.reload, onSelect: () => void reloadPage() },
        { id: 'url', label: 'Go to URL…', icon: icons.GlobeIcon, shortcut: SHORTCUT.focusUrl, onSelect: onFocusAddressBar },
        { id: 'devtools', label: 'Open DevTools for the page', icon: icons.DevToolsIcon, shortcut: SHORTCUT.pageDevTools, onSelect: () => void openPageDevTools() },
        { id: 'folder', label: 'Open the overrides folder', icon: icons.FolderIcon, onSelect: () => void api.revealOverridesFolder() },
        { id: 'settings', label: 'Settings', icon: icons.SettingsIcon, onSelect: onShowSettings },
        { id: 'whats-new', label: "What's New", icon: icons.WhatsNewIcon, keywords: ['release notes', 'changelog', 'version'], onSelect: openWhatsNew },
        { id: 'check-updates', label: 'Check for updates', icon: icons.DownloadIcon, keywords: ['update', 'upgrade', 'version'], onSelect: () => void checkForUpdatesNow() },
      ],
    };
    const overrideGroup: CommandGroup = {
      heading: 'Overrides',
      items: overrides.flatMap((o) => [
        { id: `${OVERRIDE_ITEM_PREFIX.open}${o.id}`, label: fileName(o.sourceUrl), hint: hostOf(o.sourceUrl), icon: KIND_ICON[o.kind], keywords: [o.sourceUrl], onSelect: () => void openOverride(o.id) },
        {
          id: `${OVERRIDE_ITEM_PREFIX.toggle}${o.id}`,
          label: `${o.enabled ? 'Turn off' : 'Turn on'} override: ${fileName(o.sourceUrl)}`,
          icon: icons.LiveIcon,
          keywords: [o.sourceUrl, 'enable', 'disable'],
          onSelect: () => void setOverrideEnabled(o.id, !o.enabled),
        },
      ]),
    };
    const workspaceGroup: CommandGroup = {
      heading: 'Workspaces',
      items: [
        ...workspaces
          .filter((w) => w.id !== activeWorkspaceId)
          .map((w) => ({
            id: `${WORKSPACE_ITEM_PREFIX}${w.id}`,
            label: `Switch to ${workspaceLabel(w)}`,
            hint: workspaceDetail(w) || undefined,
            icon: icons.BrowserIcon,
            keywords: ['workspace', w.host, w.title],
            onSelect: () => onSwitchWorkspace(w.id),
          })),
        { id: 'workspace-new', label: 'New workspace', icon: icons.AddIcon, keywords: ['workspace', 'site', 'project'], onSelect: onNewWorkspace },
      ],
    };
    return [files, sources, overrideGroup, workspaceGroup, actions].filter((g) => g.items.length);
  }, [open, files, sources, overrides, active, activeSource, workspaces, activeWorkspaceId, onShowSettings, onShowExplorer, onFocusAddressBar, onSwitchWorkspace, onNewWorkspace]);

  return <CommandPalette open={open} onOpenChange={setOpen} groups={groups} placeholder="Open a file, or type a command…" />;
}
