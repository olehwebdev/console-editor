import { ipcMain, shell, type BrowserWindow, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import {
  RESOURCE_KINDS,
  type CreateOverrideInput,
  type OverridePatch,
  type Rect,
  type Settings,
} from '../shared/types';
import type { PageController } from './PageController';
import type { OverrideStore } from './store/OverrideStore';
import type { SettingsStore } from './store/SettingsStore';

interface Deps {
  win: BrowserWindow;
  page: PageController;
  store: OverrideStore;
  settings: SettingsStore;
}

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`${name} must be a string`);
}

export function registerIpc({ win, page, store, settings }: Deps): void {
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
    const { base: _base, ...withContent } = store.get(id);
    return withContent;
  });
  handle('overrides:base', (id: unknown) => {
    assertString(id, 'id');
    return store.get(id).base;
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
    return next;
  });
}
