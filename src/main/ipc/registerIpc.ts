import { ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipcChannels';
import {
  RESOURCE_KINDS,
  type CreateOverrideInput,
  type OverridePatch,
  type Rect,
  type SessionDraft,
  type Settings,
  type WorkspacePatch,
} from '../../shared/types';
import { HTTP_URL } from '../constants';
import { assertSourceMapRequest } from './assertSourceMapRequest';
import { assertString } from './assertString';
import type { IpcDeps } from './types';

export function registerIpc({ win, page, store, settings, session, workspaces, updates, onSessionFlushed }: IpcDeps): void {
  // Only the editor UI may call these (the website view has no preload, but be strict anyway).
  const fromEditor = (event: IpcMainInvokeEvent | IpcMainEvent) => event.sender.id === win.webContents.id;

  const handle = (channel: string, fn: (...args: any[]) => unknown) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!fromEditor(event)) throw new Error('Forbidden');
      return fn(...args);
    });
  };

  handle(IPC_CHANNEL.navigate, (url: unknown) => {
    assertString(url, 'url');
    return page.navigate(url);
  });
  handle(IPC_CHANNEL.reload, () => page.reload());
  handle(IPC_CHANNEL.goBack, () => page.goBack());
  handle(IPC_CHANNEL.goForward, () => page.goForward());
  handle(IPC_CHANNEL.openPageDevTools, () => page.openDevTools());
  handle(IPC_CHANNEL.getPageState, () => page.state());
  handle(IPC_CHANNEL.capturePage, () => page.capture());
  ipcMain.on(IPC_CHANNEL.setPageBounds, (event, rect: Rect) => {
    if (!fromEditor(event)) return;
    // The renderer measures CSS pixels; the view is placed in window pixels (they differ when the editor is zoomed).
    const zoom = win.webContents.getZoomFactor();
    page.setBounds({ x: rect.x * zoom, y: rect.y * zoom, width: rect.width * zoom, height: rect.height * zoom });
  });

  handle(IPC_CHANNEL.listResources, () => page.listResources());
  handle(IPC_CHANNEL.getResourceContent, (url: unknown) => {
    assertString(url, 'url');
    return page.getResourceContent(url);
  });
  handle(IPC_CHANNEL.getSourceMap, (request: unknown) => {
    assertSourceMapRequest(request);
    return page.getSourceMap(request);
  });

  handle(IPC_CHANNEL.listOverrides, () => store.metas());
  handle(IPC_CHANNEL.getOverride, (id: unknown) => {
    assertString(id, 'id');
    return store.get(id);
  });
  handle(IPC_CHANNEL.getOverrideBase, (id: unknown) => {
    assertString(id, 'id');
    return store.base(id);
  });
  handle(IPC_CHANNEL.createOverride, async (input: CreateOverrideInput) => {
    assertString(input?.sourceUrl, 'sourceUrl');
    assertString(input.content, 'content');
    if (input.base !== undefined) assertString(input.base, 'base');
    if (!RESOURCE_KINDS.includes(input.kind)) throw new Error(`Unsupported kind ${String(input.kind)}`);
    const created = await store.create(input);
    await page.overridesChanged();
    return store.meta(created.id);
  });
  handle(IPC_CHANNEL.updateOverride, async (id: unknown, patch: OverridePatch) => {
    assertString(id, 'id');
    await store.update(id, patch);
    await page.overridesChanged(patch.match !== undefined || patch.enabled !== undefined);
    return store.meta(id);
  });
  handle(IPC_CHANNEL.deleteOverride, async (id: unknown) => {
    assertString(id, 'id');
    await store.remove(id);
    await page.overridesChanged();
  });
  handle(IPC_CHANNEL.revealOverridesFolder, async () => {
    await shell.openPath(store.filesDir);
  });

  handle(IPC_CHANNEL.getSettings, () => settings.get());
  handle(IPC_CHANNEL.updateSettings, async (patch: Partial<Settings>) => {
    const next = await settings.update(patch);
    await page.settingsChanged();
    // Turning automatic checks on or off takes effect now.
    if (patch.checkForUpdates !== undefined) updates.schedule();
    return next;
  });

  handle(IPC_CHANNEL.getWorkspaces, () => workspaces.state());
  handle(IPC_CHANNEL.getWorkspaceFavicons, () => workspaces.favicons());
  handle(IPC_CHANNEL.createWorkspace, () => workspaces.create());
  handle(IPC_CHANNEL.updateWorkspace, (id: unknown, patch: WorkspacePatch) => workspaces.update(id, patch));
  handle(IPC_CHANNEL.deleteWorkspace, (id: unknown) => workspaces.remove(id));
  handle(IPC_CHANNEL.switchWorkspace, (id: unknown) => workspaces.switchTo(id));

  handle(IPC_CHANNEL.listFrames, () => page.console.listFrames());
  handle(IPC_CHANNEL.getConsoleEntries, () => page.console.listEntries());
  handle(IPC_CHANNEL.evaluateInFrame, (frameId: unknown, code: unknown) => page.console.evaluate(frameId, code));
  handle(IPC_CHANNEL.getConsoleProperties, (handle: unknown) => page.console.properties(handle));
  handle(IPC_CHANNEL.clearConsole, () => page.console.clear());

  handle(IPC_CHANNEL.getSession, () => session.get());
  handle(IPC_CHANNEL.saveSessionTabs, (workspaceId: unknown, tabs: unknown, activeTabId: unknown) => session.setTabs(workspaceId, tabs, activeTabId));
  handle(IPC_CHANNEL.getDraft, (id: unknown) => session.getDraft(id));
  handle(IPC_CHANNEL.saveDraft, (id: unknown, draft: SessionDraft) => session.saveDraft(id, draft));
  handle(IPC_CHANNEL.deleteDraft, (id: unknown) => session.deleteDraft(id));
  ipcMain.on(IPC_CHANNEL.sessionFlushed, (event, ok: unknown) => {
    if (fromEditor(event)) onSessionFlushed(ok === true);
  });

  handle(IPC_CHANNEL.getAppInfo, () => updates.appInfo());
  handle(IPC_CHANNEL.openExternal, (url: unknown) => {
    assertString(url, 'url');
    if (!HTTP_URL.test(url)) throw new Error('Only http(s) links open externally');
    return shell.openExternal(url);
  });
  handle(IPC_CHANNEL.getUpdateState, () => updates.state());
  handle(IPC_CHANNEL.checkForUpdates, () => updates.check(true));
  handle(IPC_CHANNEL.downloadUpdate, () => updates.download());
  handle(IPC_CHANNEL.installUpdate, () => updates.install());
}
