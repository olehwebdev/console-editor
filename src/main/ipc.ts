import { ipcMain, shell, type BrowserWindow, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import {
  RESOURCE_KINDS,
  type CreateOverrideInput,
  type OverridePatch,
  type Rect,
  type SessionDraft,
  type Settings,
} from '../shared/types';
import type { PageController } from './PageController';
import type { OverrideStore } from './store/OverrideStore';
import type { SessionStore } from './store/SessionStore';
import type { SettingsStore } from './store/SettingsStore';
import type { UpdateService } from './update/UpdateService';

interface Deps {
  win: BrowserWindow;
  page: PageController;
  store: OverrideStore;
  settings: SettingsStore;
  session: SessionStore;
  updates: UpdateService;
  /** The renderer answered a `flush-session` event. */
  onSessionFlushed(ok: boolean): void;
}

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`${name} must be a string`);
}

export function registerIpc({ win, page, store, settings, session, updates, onSessionFlushed }: Deps): void {
  // Only the editor UI may call these (the website view has no preload, but be strict anyway).
  const fromEditor = (event: IpcMainInvokeEvent | IpcMainEvent) => event.sender.id === win.webContents.id;

  const handle = (channel: string, fn: (...args: any[]) => unknown) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!fromEditor(event)) throw new Error('Forbidden');
      return fn(...args);
    });
  };

  handle('page:navigate', (url: unknown) => {
    assertString(url, 'url');
    return page.navigate(url);
  });
  handle('page:reload', () => page.reload());
  handle('page:back', () => page.goBack());
  handle('page:forward', () => page.goForward());
  handle('page:devtools', () => page.openDevTools());
  handle('page:state', () => page.state());
  handle('page:capture', () => page.capture());
  ipcMain.on('page:bounds', (event, rect: Rect) => {
    if (!fromEditor(event)) return;
    // The renderer measures CSS pixels; the view is placed in window pixels (they differ when the editor is zoomed).
    const zoom = win.webContents.getZoomFactor();
    page.setBounds({ x: rect.x * zoom, y: rect.y * zoom, width: rect.width * zoom, height: rect.height * zoom });
  });

  handle('resources:list', () => page.listResources());
  handle('resources:content', (url: unknown) => {
    assertString(url, 'url');
    return page.getResourceContent(url);
  });

  handle('overrides:list', () => store.metas());
  handle('overrides:get', (id: unknown) => {
    assertString(id, 'id');
    return store.get(id);
  });
  handle('overrides:base', (id: unknown) => {
    assertString(id, 'id');
    return store.base(id);
  });
  handle('overrides:create', async (input: CreateOverrideInput) => {
    assertString(input?.sourceUrl, 'sourceUrl');
    assertString(input.content, 'content');
    if (input.base !== undefined) assertString(input.base, 'base');
    if (!RESOURCE_KINDS.includes(input.kind)) throw new Error(`Unsupported kind ${String(input.kind)}`);
    const created = await store.create(input);
    await page.overridesChanged();
    return store.meta(created.id);
  });
  handle('overrides:update', async (id: unknown, patch: OverridePatch) => {
    assertString(id, 'id');
    await store.update(id, patch);
    await page.overridesChanged(patch.match !== undefined || patch.enabled !== undefined);
    return store.meta(id);
  });
  handle('overrides:delete', async (id: unknown) => {
    assertString(id, 'id');
    await store.remove(id);
    await page.overridesChanged();
  });
  handle('overrides:reveal', async () => {
    await shell.openPath(store.filesDir);
  });

  handle('settings:get', () => settings.get());
  handle('settings:update', async (patch: Partial<Settings>) => {
    const next = await settings.update(patch);
    await page.settingsChanged();
    // Turning automatic checks on or off takes effect now.
    if (patch.checkForUpdates !== undefined) updates.schedule();
    return next;
  });

  handle('session:get', () => session.get());
  handle('session:tabs', (tabs: unknown, activeTabId: unknown) => session.setTabs(tabs, activeTabId));
  handle('session:draft:get', (id: unknown) => session.getDraft(id));
  handle('session:draft:save', (id: unknown, draft: SessionDraft) => session.saveDraft(id, draft));
  handle('session:draft:delete', (id: unknown) => session.deleteDraft(id));
  ipcMain.on('session:flushed', (event, ok: unknown) => {
    if (fromEditor(event)) onSessionFlushed(ok === true);
  });

  handle('app:info', () => updates.appInfo());
  handle('app:open-external', (url: unknown) => {
    assertString(url, 'url');
    if (!/^https?:\/\//i.test(url)) throw new Error('Only http(s) links open externally');
    return shell.openExternal(url);
  });
  handle('update:state', () => updates.state());
  handle('update:check', () => updates.check(true));
  handle('update:download', () => updates.download());
  handle('update:install', () => updates.install());
}
