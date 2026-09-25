import type { ConsoleEditorApi } from './types';

/**
 * The IPC channel behind each `window.consoleEditor` method, for the main process and the preload
 * bridge (the renderer only sees the API): a new method fails typecheck until it has one. `onEvent`
 * is the channel every AppEvent is pushed on. Keep this file free of runtime imports so every bundle
 * can include it.
 */
export const IPC_CHANNEL = {
  navigate: 'page:navigate',
  reload: 'page:reload',
  goBack: 'page:back',
  goForward: 'page:forward',
  openPageDevTools: 'page:devtools',
  getPageState: 'page:state',
  setPageBounds: 'page:bounds',
  capturePage: 'page:capture',
  detachPage: 'page:detach',
  attachPage: 'page:attach',

  listResources: 'resources:list',
  getResourceContent: 'resources:content',
  getSourceMap: 'resources:source-map',

  listOverrides: 'overrides:list',
  getOverride: 'overrides:get',
  getOverrideBase: 'overrides:base',
  createOverride: 'overrides:create',
  updateOverride: 'overrides:update',
  deleteOverride: 'overrides:delete',
  revealOverridesFolder: 'overrides:reveal',

  listRules: 'rules:list',
  createRule: 'rules:create',
  updateRule: 'rules:update',
  deleteRule: 'rules:delete',

  getSettings: 'settings:get',
  updateSettings: 'settings:update',

  getWorkspaces: 'workspaces:list',
  getWorkspaceFavicons: 'workspaces:favicons',
  createWorkspace: 'workspaces:create',
  updateWorkspace: 'workspaces:update',
  deleteWorkspace: 'workspaces:delete',
  switchWorkspace: 'workspaces:switch',

  listFrames: 'console:frames',
  getConsoleEntries: 'console:entries',
  evaluateInFrame: 'console:evaluate',
  getConsoleProperties: 'console:properties',
  clearConsole: 'console:clear',

  listStacks: 'inspect:stacks',
  scanStacks: 'inspect:scan',
  startPicking: 'inspect:pick',
  stopPicking: 'inspect:pick-stop',
  inspectComponent: 'inspect:component',
  setComponentState: 'inspect:set-state',
  highlightPick: 'inspect:highlight',
  componentTree: 'inspect:tree',
  recordRenders: 'inspect:record-renders',
  isRecordingRenders: 'inspect:recording-renders',
  openTreeNode: 'inspect:tree-open',
  highlightTreeNode: 'inspect:tree-highlight',

  listActions: 'actions:list',
  createAction: 'actions:create',
  updateAction: 'actions:update',
  deleteAction: 'actions:delete',
  getActionsWindow: 'actions-window:state',
  detachActions: 'actions-window:detach',
  attachActions: 'actions-window:attach',
  setActionsOnTop: 'actions-window:on-top',

  getSession: 'session:get',
  saveSessionTabs: 'session:tabs',
  getDraft: 'session:draft:get',
  saveDraft: 'session:draft:save',
  deleteDraft: 'session:draft:delete',
  sessionFlushed: 'session:flushed',

  getAppInfo: 'app:info',
  getUpdateState: 'update:state',
  checkForUpdates: 'update:check',
  downloadUpdate: 'update:download',
  installUpdate: 'update:install',
  openExternal: 'app:open-external',

  onEvent: 'app:event',
} as const satisfies Record<keyof ConsoleEditorApi, string>;
