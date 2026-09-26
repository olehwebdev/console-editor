import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SHORTCUT } from '@common/constants';
import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import { fileName, hostOf, pathOf } from '@/shared/lib';
import { CommandPalette, type CommandGroup } from '@/shared/ui/command-palette';
import { selectActiveSource, selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { selectOverrideList, useOverrideStore } from '@/entities/override';
import { useRenderLog, useStoreLog } from '@/entities/inspector';
import { usePageStore } from '@/entities/page';
import { selectRuleList, useRuleStore } from '@/entities/rule';
import { workerScriptUrl, WORKER_NAME } from '@/entities/resource';
import { useWorkspaceStore, workspaceDetail, workspaceLabel } from '@/entities/workspace';
import { attachPage, detachPage } from '@/features/detach-page';
import { openPageDevTools, reloadPage } from '@/features/navigate-page';
import { openOverride, openResource } from '@/features/open-resource';
import { setOverrideEnabled } from '@/features/toggle-override';
import { checkForUpdatesNow, openWhatsNew } from '@/features/update-app';
import { usePageFiles } from '../model/files';
import { usePalette } from '../model/palette';
import { useActionGroup } from '../model/useActionGroup';
import { sourceActions, useOriginalSources } from '../model/sources';
import { KIND_ICON, OVERRIDE_ITEM_PREFIX, WORKSPACE_ITEM_PREFIX } from './constants';
import { fileTabItems } from './fileTabItems';
import { inspectItems, type InspectLog } from './inspectItems';
import { newRuleItems } from './newRuleItems';
import { ruleItems } from './ruleItems';

export interface AppCommandPaletteProps {
  onShowSettings(): void;
  /** Shows the Explorer sidebar, filter cleared. */
  onShowExplorer(): void;
  onFocusAddressBar(): void;
  onSwitchWorkspace(id: string): void;
  onNewWorkspace(): void;
  onToggleConsole(): void;
  onNewAction(): void;
  onShowNetwork(): void;
  /** Shows the Renders or the Stores log in the bottom pane. */
  onShowLog(log: InspectLog): void;
}

/** Ctrl/Cmd+K: jump to any file the page loaded, an original of a loaded map, an override or a rule, run an action, switch workspaces or run a command. */
export function AppCommandPalette({ onShowSettings, onShowExplorer, onFocusAddressBar, onSwitchWorkspace, onNewWorkspace, onToggleConsole, onNewAction, onShowNetwork, onShowLog }: AppCommandPaletteProps) {
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const overrides = useOverrideStore(useShallow(selectOverrideList));
  const rules = useRuleStore(useShallow(selectRuleList));
  const active = useTabStore(selectActiveTab);
  const activeSource = useTabStore(selectActiveSource);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeId);
  const detached = usePageStore((s) => s.page.detached);
  const recordingRenders = useRenderLog((s) => s.recording);
  const recordingStores = useStoreLog((s) => s.recording);
  const runGroup = useActionGroup(onNewAction);

  const resources = usePageFiles(open);
  const files = useMemo<CommandGroup>(
    () => ({
      heading: 'Page files',
      // Every file: the list is virtualized, so a page with thousands stays fast.
      items: resources.map((r) => {
        const workerName = r.worker && WORKER_NAME[r.worker.type];
        const workerUrl = workerScriptUrl(r);
        return {
          id: r.url,
          label: fileName(r.url),
          hint: `${hostOf(r.url)}${pathOf(r.url)}${r.frame ? ' · iframe' : ''}${workerName ? ` · ${workerName}` : ''}`,
          icon: KIND_ICON[r.kind],
          keywords: [r.url, ...(r.frame ? ['iframe', r.frame.url] : []), ...(workerName ? [workerName] : []), ...(workerUrl ? [workerUrl] : [])],
          onSelect: () => void openResource(r.url),
        };
      }),
    }),
    [resources],
  );
  const sources = useOriginalSources(resources);

  const groups = useMemo<CommandGroup[]>(() => {
    if (!open) return [];
    // Moving the website to a window of its own (another screen), or back.
    const move = detached
      ? { label: 'Put the website back in the editor window', icon: icons.DockIcon, run: attachPage }
      : { label: 'Open the website in its own window', icon: icons.PopOutIcon, run: detachPage };
    const actions: CommandGroup = {
      heading: 'Actions',
      items: [
        ...fileTabItems(active),
        ...sourceActions(active, activeSource, onShowExplorer),
        { id: 'reload', label: 'Reload page', icon: icons.ReloadIcon, shortcut: SHORTCUT.reload, onSelect: () => void reloadPage() },
        { id: 'console', label: 'Toggle console', icon: icons.ConsoleIcon, shortcut: SHORTCUT.console, keywords: ['logs', 'iframe', 'frame', 'run'], onSelect: onToggleConsole },
        { id: 'network', label: 'Show network', icon: icons.NetworkIcon, keywords: ['requests', 'fetch', 'xhr', 'api', 'json', 'graphql', 'response'], onSelect: onShowNetwork },
        { id: 'url', label: 'Go to URL…', icon: icons.GlobeIcon, shortcut: SHORTCUT.focusUrl, onSelect: onFocusAddressBar },
        { id: 'page-window', label: move.label, icon: move.icon, keywords: ['window', 'screen', 'monitor', 'detach', 'pop out', 'attach'], onSelect: () => void move.run() },
        ...inspectItems({ renders: recordingRenders, stores: recordingStores }, onShowLog),
        { id: 'devtools', label: 'Open DevTools for the page', icon: icons.DevToolsIcon, shortcut: SHORTCUT.pageDevTools, onSelect: () => void openPageDevTools() },
        ...newRuleItems(),
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
    const ruleGroup: CommandGroup = { heading: 'Rules', items: ruleItems(rules) };
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
    return [files, sources, overrideGroup, ruleGroup, runGroup, workspaceGroup, actions].filter((g) => g.items.length);
  }, [open, files, sources, overrides, rules, runGroup, active, activeSource, workspaces, activeWorkspaceId, detached, onShowSettings, onShowExplorer, onFocusAddressBar, onSwitchWorkspace, onNewWorkspace, onToggleConsole, onShowNetwork, recordingRenders, recordingStores, onShowLog]);

  return <CommandPalette open={open} onOpenChange={setOpen} groups={groups} placeholder="Open a file, or type a command…" />;
}
