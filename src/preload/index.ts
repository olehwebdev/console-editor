import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNEL } from '../shared/ipcChannels';
import type { AppEvent, ConsoleEditorApi } from '../shared/types';

/** The global the renderer reaches the API through (`window.consoleEditor`, declared in its shared/api). */
const API_GLOBAL = 'consoleEditor';

const api: ConsoleEditorApi = {
  navigate: (url) => ipcRenderer.invoke(IPC_CHANNEL.navigate, url),
  reload: () => ipcRenderer.invoke(IPC_CHANNEL.reload),
  goBack: () => ipcRenderer.invoke(IPC_CHANNEL.goBack),
  goForward: () => ipcRenderer.invoke(IPC_CHANNEL.goForward),
  openPageDevTools: () => ipcRenderer.invoke(IPC_CHANNEL.openPageDevTools),
  getPageState: () => ipcRenderer.invoke(IPC_CHANNEL.getPageState),
  setPageBounds: (bounds) => ipcRenderer.send(IPC_CHANNEL.setPageBounds, bounds),
  capturePage: () => ipcRenderer.invoke(IPC_CHANNEL.capturePage),
  detachPage: () => ipcRenderer.invoke(IPC_CHANNEL.detachPage),
  attachPage: () => ipcRenderer.invoke(IPC_CHANNEL.attachPage),

  listResources: () => ipcRenderer.invoke(IPC_CHANNEL.listResources),
  getResourceContent: (url) => ipcRenderer.invoke(IPC_CHANNEL.getResourceContent, url),
  getSourceMap: (request) => ipcRenderer.invoke(IPC_CHANNEL.getSourceMap, request),

  listOverrides: () => ipcRenderer.invoke(IPC_CHANNEL.listOverrides),
  getOverride: (id) => ipcRenderer.invoke(IPC_CHANNEL.getOverride, id),
  getOverrideBase: (id) => ipcRenderer.invoke(IPC_CHANNEL.getOverrideBase, id),
  createOverride: (input) => ipcRenderer.invoke(IPC_CHANNEL.createOverride, input),
  updateOverride: (id, patch) => ipcRenderer.invoke(IPC_CHANNEL.updateOverride, id, patch),
  deleteOverride: (id) => ipcRenderer.invoke(IPC_CHANNEL.deleteOverride, id),
  revealOverridesFolder: () => ipcRenderer.invoke(IPC_CHANNEL.revealOverridesFolder),

  listRules: () => ipcRenderer.invoke(IPC_CHANNEL.listRules),
  createRule: (input) => ipcRenderer.invoke(IPC_CHANNEL.createRule, input),
  updateRule: (id, patch) => ipcRenderer.invoke(IPC_CHANNEL.updateRule, id, patch),
  deleteRule: (id) => ipcRenderer.invoke(IPC_CHANNEL.deleteRule, id),

  getSettings: () => ipcRenderer.invoke(IPC_CHANNEL.getSettings),
  updateSettings: (patch) => ipcRenderer.invoke(IPC_CHANNEL.updateSettings, patch),

  getWorkspaces: () => ipcRenderer.invoke(IPC_CHANNEL.getWorkspaces),
  getWorkspaceFavicons: () => ipcRenderer.invoke(IPC_CHANNEL.getWorkspaceFavicons),
  createWorkspace: () => ipcRenderer.invoke(IPC_CHANNEL.createWorkspace),
  updateWorkspace: (id, patch) => ipcRenderer.invoke(IPC_CHANNEL.updateWorkspace, id, patch),
  deleteWorkspace: (id) => ipcRenderer.invoke(IPC_CHANNEL.deleteWorkspace, id),
  switchWorkspace: (id) => ipcRenderer.invoke(IPC_CHANNEL.switchWorkspace, id),

  listFrames: () => ipcRenderer.invoke(IPC_CHANNEL.listFrames),
  getConsoleEntries: () => ipcRenderer.invoke(IPC_CHANNEL.getConsoleEntries),
  evaluateInFrame: (frameId, code) => ipcRenderer.invoke(IPC_CHANNEL.evaluateInFrame, frameId, code),
  getConsoleProperties: (handle) => ipcRenderer.invoke(IPC_CHANNEL.getConsoleProperties, handle),
  clearConsole: () => ipcRenderer.invoke(IPC_CHANNEL.clearConsole),
  listActions: () => ipcRenderer.invoke(IPC_CHANNEL.listActions),
  createAction: (input) => ipcRenderer.invoke(IPC_CHANNEL.createAction, input),
  updateAction: (id, patch) => ipcRenderer.invoke(IPC_CHANNEL.updateAction, id, patch),
  deleteAction: (id) => ipcRenderer.invoke(IPC_CHANNEL.deleteAction, id),
  getSession: () => ipcRenderer.invoke(IPC_CHANNEL.getSession),
  saveSessionTabs: (workspaceId, tabs, activeTabId) => ipcRenderer.invoke(IPC_CHANNEL.saveSessionTabs, workspaceId, tabs, activeTabId),
  getDraft: (tabId) => ipcRenderer.invoke(IPC_CHANNEL.getDraft, tabId),
  saveDraft: (tabId, draft) => ipcRenderer.invoke(IPC_CHANNEL.saveDraft, tabId, draft),
  deleteDraft: (tabId) => ipcRenderer.invoke(IPC_CHANNEL.deleteDraft, tabId),
  sessionFlushed: (ok) => ipcRenderer.send(IPC_CHANNEL.sessionFlushed, ok),

  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNEL.getAppInfo),
  getUpdateState: () => ipcRenderer.invoke(IPC_CHANNEL.getUpdateState),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNEL.checkForUpdates),
  downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNEL.downloadUpdate),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNEL.installUpdate),
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNEL.openExternal, url),

  onEvent(listener) {
    const handler = (_event: IpcRendererEvent, payload: AppEvent) => listener(payload);
    ipcRenderer.on(IPC_CHANNEL.onEvent, handler);
    return () => ipcRenderer.off(IPC_CHANNEL.onEvent, handler);
  },
};

contextBridge.exposeInMainWorld(API_GLOBAL, api);
