import type { AppEvent, MenuCommand } from '@common/types';
import { api, onAppEvent } from '@/shared/api';
import { fileName } from '@/shared/lib';
import { editorHasFocus, triggerInActiveEditor } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { selectHasDirtyTabs, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useResourceStore } from '@/entities/resource';
import { useSettingsStore } from '@/entities/settings';
import { toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { reloadPage } from '@/features/navigate-page';
import { saveTab } from '@/features/save-override';

/** Elements that want focus on "Focus Address Bar" register themselves here. */
export const focusTargets = { addressBar: null as HTMLInputElement | null };

function runCommand(command: MenuCommand): void {
  switch (command) {
    case 'save':
      void saveTab();
      return;
    case 'format':
      void formatTab();
      return;
    case 'toggle-diff':
      toggleBaseDiff();
      return;
    case 'focus-url':
      focusTargets.addressBar?.focus();
      focusTargets.addressBar?.select();
      return;
    case 'undo':
    case 'redo':
      if (editorHasFocus()) triggerInActiveEditor(command);
      else document.execCommand(command);
      return;
    case 'select-all':
      if (editorHasFocus()) triggerInActiveEditor('editor.action.selectAll');
      else document.execCommand('selectAll');
      return;
  }
}

/** Routes one main-process event into the entity stores. */
export function handleAppEvent(event: AppEvent): void {
  switch (event.type) {
    case 'navigated':
      if (event.iframeId) useResourceStore.getState().dropIframe(event.iframeId);
      else useResourceStore.getState().reset();
      return;
    case 'iframe-detached':
      useResourceStore.getState().dropIframe(event.iframeId);
      return;
    case 'resource':
      useResourceStore.getState().add(event.resource);
      return;
    case 'override-served':
      useOverrideStore.getState().hit(event.overrideId);
      return;
    case 'upstream-changed':
      if (!useOverrideStore.getState().upstreamChanged[event.overrideId]) {
        toast({
          title: `The live ${fileName(event.url)} changed`,
          description: 'It was redeployed since you created this override. Your version is still served.',
          tone: 'warning',
        });
      }
      useOverrideStore.getState().markUpstreamChanged(event.overrideId);
      return;
    case 'override-missed':
      toast({
        id: `missed:${event.overrideId}`,
        title: `Your override didn't apply to ${fileName(event.url)}`,
        description: 'The page received the live file (an iframe changed process mid-load). Reloading usually fixes it.',
        tone: 'warning',
        action: { label: 'Reload page', onClick: () => void reloadPage() },
        duration: 8000,
      });
      return;
    case 'error':
      toast({ title: 'Something went wrong', description: event.message, tone: 'danger' });
      return;
    case 'page-state':
      usePageStore.getState().setPage(event.state);
      return;
    case 'overrides-changed':
      useOverrideStore.getState().setAll(event.overrides);
      // Tabs whose override was deleted elsewhere become unsaved tabs again.
      for (const tab of useTabStore.getState().tabs) {
        if (tab.overrideId && !event.overrides.some((o) => o.id === tab.overrideId)) useTabStore.getState().patch(tab.id, { overrideId: undefined });
      }
      return;
    case 'command':
      runCommand(event.command);
      return;
  }
}

/** Loads the initial state and starts routing events. Returns a cleanup. */
export async function startBridge(): Promise<() => void> {
  const off = onAppEvent(handleAppEvent);
  const [settings, overrides, resources, page] = await Promise.all([
    api.getSettings(),
    api.listOverrides(),
    api.listResources(),
    api.getPageState(),
  ]);
  useSettingsStore.getState().setSettings(settings);
  useOverrideStore.getState().setAll(overrides);
  useResourceStore.getState().addMany(resources);
  usePageStore.getState().setPage(page);

  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (selectHasDirtyTabs(useTabStore.getState())) {
      e.preventDefault();
      e.returnValue = false;
    }
  };
  window.addEventListener('beforeunload', beforeUnload);
  return () => {
    off();
    window.removeEventListener('beforeunload', beforeUnload);
  };
}
