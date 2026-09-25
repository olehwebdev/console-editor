import type { ActionInput, ActionPatch, ConsoleAction } from './actions';
import type { ConsoleEntry, ConsoleFrame, ConsoleProperty } from './console';
import type { AppEvent } from './events';
import type { CreateOverrideInput, OverrideMeta, OverridePatch, OverrideWithContent } from './overrides';
import type { PageState, Rect } from './page';
import type { ResourceContent, ResourceEntry } from './resources';
import type { CreateRuleInput, Rule, RulePatch } from './rules';
import type { SessionDraft, SessionState, SessionTab } from './session';
import type { SourceMapFile, SourceMapRequest } from './sourceMaps';
import type { Settings } from './settings';
import type { AppInfo, UpdateState } from './updates';
import type { Workspace, WorkspacePatch, WorkspacesState } from './workspaces';

/** The API exposed to the renderer as `window.consoleEditor`. */
export interface ConsoleEditorApi {
  navigate(url: string): Promise<void>;
  reload(): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  openPageDevTools(): Promise<void>;
  getPageState(): Promise<PageState>;
  setPageBounds(bounds: Rect): void;
  /** A still image (data URL) of the page, shown while overlays cover the native view; null if nothing is loaded. */
  capturePage(): Promise<string | null>;
  /**
   * Shows the website in a window of its own, which can go to another screen: the page moves there and
   * keeps running. When it already is, brings that window forward with its address bar focused.
   */
  detachPage(): Promise<void>;
  /** Puts the website back into the editor's window, closing its own. */
  attachPage(): Promise<void>;

  listResources(): Promise<ResourceEntry[]>;
  getResourceContent(url: string): Promise<ResourceContent>;
  /**
   * Finds and reads a listed script's or stylesheet's source map: http(s) through the site's session,
   * data: handed over undecoded, other schemes refused.
   */
  getSourceMap(request: SourceMapRequest): Promise<SourceMapFile>;

  /** The active workspace's overrides. */
  listOverrides(): Promise<OverrideMeta[]>;
  /** Metadata + served content. Large files cross IPC once, when a tab opens. */
  getOverride(id: string): Promise<OverrideWithContent>;
  /** The diff base, fetched only when a diff is actually shown. */
  getOverrideBase(id: string): Promise<string>;
  /** Returns metadata only: the content the renderer just sent is not echoed back. */
  createOverride(input: CreateOverrideInput): Promise<OverrideMeta>;
  updateOverride(id: string, patch: OverridePatch): Promise<OverrideMeta>;
  deleteOverride(id: string): Promise<void>;
  revealOverridesFolder(): Promise<void>;

  /** The active workspace's rules, oldest first. */
  listRules(): Promise<Rule[]>;
  /** Adds an enabled rule to the active workspace. Rejects input validateRuleInput refuses; 'rules-changed' is sent before this resolves. */
  createRule(input: CreateRuleInput): Promise<Rule>;
  /** Reaches a rule of any workspace, so an edit in flight during a switch lands where it began. */
  updateRule(id: string, patch: RulePatch): Promise<Rule>;
  deleteRule(id: string): Promise<void>;

  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  getWorkspaces(): Promise<WorkspacesState>;
  /** Site icons (data URLs) by workspace id, for those that have one. */
  getWorkspaceFavicons(): Promise<Record<string, string>>;
  /** Adds an empty workspace (without switching to it). */
  createWorkspace(): Promise<Workspace>;
  updateWorkspace(id: string, patch: WorkspacePatch): Promise<Workspace>;
  /** Deletes a workspace that isn't the active one, with its overrides, rules and drafts. */
  deleteWorkspace(id: string): Promise<void>;
  /**
   * Makes `id` the active workspace: the page leaves for its last page, and its
   * overrides apply. Close the tabs first (their drafts written); then reopen
   * the ones `getSession` lists.
   */
  switchWorkspace(id: string): Promise<void>;

  /** The page's frames, the top page first; empty while the console isn't recording. */
  listFrames(): Promise<ConsoleFrame[]>;
  /** The console rows kept so far (the most recent `MAX_CONSOLE_ENTRIES`). */
  getConsoleEntries(): Promise<ConsoleEntry[]>;
  /** Runs `code` in a frame, as the console does. Its input and result also arrive as entries; resolves with the result's. */
  evaluateInFrame(frameId: string, code: string): Promise<ConsoleEntry>;
  /** One level of an expandable value's properties. */
  getConsoleProperties(handle: number): Promise<ConsoleProperty[]>;
  clearConsole(): Promise<void>;

  /** The active workspace's actions, oldest first. */
  listActions(): Promise<ConsoleAction[]>;
  /** Adds an action to the active workspace; the list follows as `actions-changed`. */
  createAction(input: ActionInput): Promise<ConsoleAction>;
  updateAction(id: string, patch: ActionPatch): Promise<ConsoleAction>;
  deleteAction(id: string): Promise<void>;

  /** The active workspace's page and tabs. */
  getSession(): Promise<SessionState>;
  /** Ignored if `workspaceId` is no longer there. */
  saveSessionTabs(workspaceId: string, tabs: SessionTab[], activeTabId: string | null): Promise<void>;
  getDraft(tabId: string): Promise<SessionDraft | null>;
  /** `base` only needs sending once per tab: it's kept when omitted. */
  saveDraft(tabId: string, draft: SessionDraft): Promise<void>;
  deleteDraft(tabId: string): Promise<void>;
  /** Answers `flush-session`: `ok` false when drafts could not be written. */
  sessionFlushed(ok: boolean): void;

  getAppInfo(): Promise<AppInfo>;
  getUpdateState(): Promise<UpdateState>;
  /** Checks now, whatever the setting; the result arrives as an `update` event too. */
  checkForUpdates(): Promise<UpdateState>;
  downloadUpdate(): Promise<void>;
  /** Restarts into the downloaded update (auto), or opens the downloaded file (manual). */
  installUpdate(): Promise<void>;
  /** Opens an http(s) link in the default browser. */
  openExternal(url: string): Promise<void>;

  onEvent(listener: (event: AppEvent) => void): () => void;
}
