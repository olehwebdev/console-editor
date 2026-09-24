import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { AppEvent, ConsoleEditorApi } from '../shared/types';

const api: ConsoleEditorApi = {
  navigate: (url) => ipcRenderer.invoke('page:navigate', url),
  reload: () => ipcRenderer.invoke('page:reload'),
  goBack: () => ipcRenderer.invoke('page:back'),
  goForward: () => ipcRenderer.invoke('page:forward'),
  openPageDevTools: () => ipcRenderer.invoke('page:devtools'),
  getPageState: () => ipcRenderer.invoke('page:state'),
  setPageBounds: (bounds) => ipcRenderer.send('page:bounds', bounds),
  capturePage: () => ipcRenderer.invoke('page:capture'),

  listResources: () => ipcRenderer.invoke('resources:list'),
  getResourceContent: (url) => ipcRenderer.invoke('resources:content', url),

  listOverrides: () => ipcRenderer.invoke('overrides:list'),
  getOverride: (id) => ipcRenderer.invoke('overrides:get', id),
  getOverrideBase: (id) => ipcRenderer.invoke('overrides:base', id),
  createOverride: (input) => ipcRenderer.invoke('overrides:create', input),
  updateOverride: (id, patch) => ipcRenderer.invoke('overrides:update', id, patch),
  deleteOverride: (id) => ipcRenderer.invoke('overrides:delete', id),
  revealOverridesFolder: () => ipcRenderer.invoke('overrides:reveal'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),

  getSession: () => ipcRenderer.invoke('session:get'),
  saveSessionTabs: (tabs, activeTabId) => ipcRenderer.invoke('session:tabs', tabs, activeTabId),
  getDraft: (tabId) => ipcRenderer.invoke('session:draft:get', tabId),
  saveDraft: (tabId, draft) => ipcRenderer.invoke('session:draft:save', tabId, draft),
  deleteDraft: (tabId) => ipcRenderer.invoke('session:draft:delete', tabId),
  sessionFlushed: (ok) => ipcRenderer.send('session:flushed', ok),

  onEvent(listener) {
    const handler = (_event: IpcRendererEvent, payload: AppEvent) => listener(payload);
    ipcRenderer.on('app:event', handler);
    return () => ipcRenderer.off('app:event', handler);
  },
};

contextBridge.exposeInMainWorld('consoleEditor', api);
