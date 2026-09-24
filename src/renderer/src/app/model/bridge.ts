import type { AppEvent, MenuCommand } from '@common/types';
import { api, onAppEvent } from '@/shared/api';
import { fileName } from '@/shared/lib';
import { editorHasFocus, triggerInActiveEditor } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useResourceStore, type ResourceOp } from '@/entities/resource';
import { useSettingsStore } from '@/entities/settings';
import { toggleBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { reloadPage } from '@/features/navigate-page';
import { saveTab } from '@/features/save-override';
import type { PageCommands } from '@/pages/editor';
import { flushSession, restoreSession, startSessionSync } from './session';

let pageCommands: PageCommands | null = null;

/** The page registers what menu commands like "Focus Address Bar" should do while it is shown. */
export function setPageCommands(commands: PageCommands | null): void {
  pageCommands = commands;
}

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
      pageCommands?.focusAddressBar();
      return;
    case 'toggle-palette':
      pageCommands?.togglePalette();
      return;
    case 'toggle-sidebar':
      pageCommands?.toggleSidebar();
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

/**
 * Resource list changes, applied once per frame in the order they arrived: a
 * page load reports thousands of files, one message each, and every store
 * update rebuilds the resource tree.
 */
let resourceOps: ResourceOp[] = [];
let resourceFrame = 0;
let resourceTimer: ReturnType<typeof setTimeout> | undefined;
/** Frames stop while the window is hidden (minimized, occluded); the store and the queue must not. */
const HIDDEN_FLUSH_MS = 250;

function queueResourceOp(op: ResourceOp): void {
  // A reset makes everything queued before it moot.
  if (op.type === 'reset') resourceOps = [op];
  else resourceOps.push(op);
  if (resourceFrame) return;
  resourceFrame = requestAnimationFrame(flushResourceOps);
  resourceTimer = setTimeout(flushResourceOps, HIDDEN_FLUSH_MS);
}

function flushResourceOps(): void {
  cancelAnimationFrame(resourceFrame);
  clearTimeout(resourceTimer);
  resourceFrame = 0;
  const ops = resourceOps;
  resourceOps = [];
  useResourceStore.getState().apply(ops);
}

/** Routes one main-process event into the entity stores. */
export function handleAppEvent(event: AppEvent): void {
  switch (event.type) {
    case 'navigated':
      queueResourceOp(event.iframeId ? { type: 'drop-iframe', iframeId: event.iframeId } : { type: 'reset' });
      return;
    case 'iframe-detached':
      queueResourceOp({ type: 'drop-iframe', iframeId: event.iframeId });
      return;
    case 'resource':
      queueResourceOp({ type: 'add', entry: event.resource });
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
        description: 'The page loaded the live file instead, e.g. it was already loading when the override was turned on. Reloading usually fixes it.',
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
    case 'flush-session':
      void flushSession().then(api.sessionFlushed, () => api.sessionFlushed(false));
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
  // Events queued while loading are older than this snapshot.
  flushResourceOps();
  useResourceStore.getState().addMany(resources);
  usePageStore.getState().setPage(page);

  // Unsaved edits are kept as drafts rather than guarded: closing never asks to discard them.
  let stopSync: (() => void) | undefined;
  let stopped = false;
  void restoreSession()
    .catch(() => undefined)
    .then(() => {
      if (!stopped) stopSync = startSessionSync();
    });
  return () => {
    stopped = true;
    off();
    stopSync?.();
  };
}
