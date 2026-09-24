/**
 * Types shared between the main process, the preload bridge and the renderer.
 * Keep this file free of runtime imports so every bundle can include it.
 */

/** The resource kinds we can override. Values match CDP `Network.ResourceType`. */
export type ResourceKind = 'Document' | 'Script' | 'Stylesheet';

export const RESOURCE_KINDS: readonly ResourceKind[] = ['Document', 'Script', 'Stylesheet'];

export type MatchType = 'exact' | 'glob' | 'regex';

/**
 * Decides which request URLs an override applies to.
 * - exact: the full URL (optionally ignoring the query string)
 * - glob:  `*` matches any run of characters, everything else is literal
 *          (use it for cache-busted names such as `main.*.js`)
 * - regex: a JavaScript regular expression tested against the full URL
 */
export interface UrlMatcher {
  type: MatchType;
  pattern: string;
  ignoreQuery: boolean;
}

export interface OverrideMeta {
  id: string;
  kind: ResourceKind;
  /** The URL the override was created from. Used for display and as the default match. */
  sourceUrl: string;
  match: UrlMatcher;
  enabled: boolean;
  /** sha256 of the upstream body when the override was created; used to detect upstream changes. */
  originalHash: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * An override as stored and served: metadata plus the edited content. The
 * content editing started from (the diff base) stays on disk until a diff
 * asks for it (`getOverrideBase`).
 */
export interface Override extends OverrideMeta {
  /** The edited content that is served instead of the upstream file. */
  content: string;
}

/** What `getOverride` returns. */
export type OverrideWithContent = Override;

export interface CreateOverrideInput {
  kind: ResourceKind;
  sourceUrl: string;
  content: string;
  /** What editing started from. Omit when identical to `content` (saves a multi-MB IPC transfer). */
  base?: string;
  originalHash: string | null;
  match?: UrlMatcher;
}

export interface OverridePatch {
  content?: string;
  match?: UrlMatcher;
  enabled?: boolean;
}

export interface ResourceEntry {
  url: string;
  kind: ResourceKind;
  mimeType: string;
  status: number;
  /** Set when the response the page received was served from an override. */
  overrideId?: string;
  /**
   * Set when the file was loaded by an iframe rather than the top-level page:
   * the iframe's document URL and nesting depth (1 = iframe, 2 = iframe in an iframe…).
   */
  frame?: { url: string; depth: number };
  /**
   * Opaque id of the cross-site (out-of-process) iframe session that reported
   * the entry. Such entries disappear when that iframe navigates or goes away.
   */
  iframeId?: string;
}

export interface ResourceContent {
  url: string;
  content: string;
  /** sha256 of the content as delivered by the server (hex). */
  hash: string;
}

export interface Settings {
  /** Reload the page after an override is saved. */
  autoReloadOnSave: boolean;
  /** Remove `integrity` attributes from HTML so edited scripts/styles are not rejected by SRI. */
  stripIntegrity: boolean;
  /** Remove sourceMappingURL comments/headers from overridden files (maps no longer line up). */
  stripSourceMaps: boolean;
  /** Bypass service workers so cached assets can't sidestep overrides. */
  bypassServiceWorker: boolean;
  /** Disable the HTTP cache so every load goes through interception. */
  disableCache: boolean;
  /** Ignore the page's Content-Security-Policy (useful when a patch uses eval or inline code). */
  bypassCSP: boolean;
  /** Pretty-print minified files when they are opened. */
  autoFormatMinified: boolean;
  /** Look for a newer release on GitHub at start and every few hours. */
  checkForUpdates: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  autoReloadOnSave: true,
  stripIntegrity: true,
  stripSourceMaps: true,
  bypassServiceWorker: true,
  disableCache: true,
  bypassCSP: false,
  autoFormatMinified: true,
  checkForUpdates: true,
};

export interface PageState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Colours a workspace's rail tile can take (tokens `--workspace-<colour>`). */
export const WORKSPACE_COLORS = ['ember', 'amber', 'lime', 'teal', 'sky', 'indigo', 'violet', 'rose'] as const;

export type WorkspaceColor = (typeof WORKSPACE_COLORS)[number];

/**
 * What a workspace's rail tile can show: the site's favicon (its colour stands in
 * until the site has one), or its colour with the first letter of its name.
 */
export const WORKSPACE_ICONS = ['favicon', 'color'] as const;

export type WorkspaceIcon = (typeof WORKSPACE_ICONS)[number];

/**
 * A saved workflow: a page, the tabs open on it with their unsaved edits, and
 * its own overrides. As the renderer sees it: the tabs come with `getSession`,
 * the favicon separately (it changes rarely, and is the biggest part).
 */
export interface Workspace {
  id: string;
  /** Given by you; '' shows `host` instead. */
  name: string;
  /** Host of the last page shown ('' if none). */
  host: string;
  /** Title of the last page shown ('' if none). */
  title: string;
  icon: WorkspaceIcon;
  color: WorkspaceColor;
}

export interface WorkspacePatch {
  name?: string;
  icon?: WorkspaceIcon;
  color?: WorkspaceColor;
}

export interface WorkspacesState {
  workspaces: Workspace[];
  activeId: string;
}

/** Events emitted by the interception engine. */
export type EngineEvent =
  /**
   * A root frame committed a new document (not merely started loading): the
   * top-level page, or a cross-site iframe's own frame when `iframeId` is set.
   * Drop the entries it owned; the new document's own entry follows.
   */
  | { type: 'navigated'; url: string; iframeId?: string }
  /** A cross-site iframe session went away (removed, reloaded, or moved to another process). */
  | { type: 'iframe-detached'; iframeId: string }
  /** An enabled override matched a file the page received unmodified (e.g. a Chromium interception gap). */
  | { type: 'override-missed'; overrideId: string; url: string }
  | { type: 'resource'; resource: ResourceEntry }
  | { type: 'override-served'; overrideId: string; url: string }
  | { type: 'upstream-changed'; overrideId: string; url: string }
  | { type: 'error'; message: string };

/** Everything the main process pushes to the renderer. */
export type AppEvent =
  | EngineEvent
  | { type: 'page-state'; state: PageState }
  /** The active workspace's overrides. */
  | { type: 'overrides-changed'; overrides: OverrideMeta[] }
  | { type: 'workspaces-changed'; state: WorkspacesState }
  /** A workspace's site icon (a data URL), or null when its page moved to another site. */
  | { type: 'workspace-favicon'; id: string; favicon: string | null }
  | { type: 'command'; command: MenuCommand }
  /** The window is closing: write pending drafts, then call `sessionFlushed`. */
  | { type: 'flush-session' }
  | { type: 'update'; state: UpdateState };

/**
 * How an update gets installed, once you've asked for it to be downloaded.
 * - auto: on Restart to update (Windows installer, AppImage, .deb, .rpm).
 * - manual: the app downloads and checks it, you install it (macOS until builds are signed
 *   with a Developer ID, which Apple's updater requires; a copy unpacked from .tar.gz).
 */
export type UpdateInstall = 'auto' | 'manual';

export interface AvailableUpdate {
  version: string;
  /** Markdown of what changed (the version's CHANGELOG section); '' when it couldn't be fetched. */
  notes: string;
  /** The release's page on GitHub. */
  releaseUrl: string;
  install: UpdateInstall;
  /**
   * An auto install also happens when the app quits (Windows installer, AppImage). A .deb or .rpm
   * installs only from Restart to update, which asks for a password.
   */
  installsOnQuit: boolean;
}

/** Where the updater is; pushed to the renderer as `update` events. */
export type UpdateState =
  /** Updates don't apply (a build run from source). */
  | { status: 'disabled' }
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date'; version: string }
  | { status: 'available'; update: AvailableUpdate }
  | { status: 'downloading'; update: AvailableUpdate; percent: number }
  /** Downloaded: restart to install (auto), or saved at `file` for you to open (manual). */
  | { status: 'ready'; update: AvailableUpdate; file?: string }
  /** A step failed; `update` is still on offer when there was one. */
  | { status: 'error'; during: 'check' | 'download' | 'install'; message: string; update?: AvailableUpdate };

export interface AppInfo {
  version: string;
  /** The version that ran before this one, when the app was just updated; otherwise null. */
  updatedFrom: string | null;
}

/** A tab as remembered between runs. Its unsaved text, if any, is a separate {@link SessionDraft}. */
export interface SessionTab {
  /** Stable for the tab's lifetime, across runs; also names its draft. */
  id: string;
  url: string;
  kind: ResourceKind;
  overrideId?: string;
  originalHash: string | null;
}

/** What the active workspace reopens: on start, and when switched to. */
export interface SessionState {
  /** Last page shown ('' if none). */
  url: string;
  tabs: SessionTab[];
  activeTabId: string | null;
}

/** Unsaved edits of a tab. */
export interface SessionDraft {
  content: string;
  /** Text editing started from, for tabs not yet saved as an override (their base lives nowhere else). */
  base?: string;
}

/** Menu actions the renderer implements (so they reach Monaco instead of the native text field). */
export type MenuCommand =
  | 'save'
  | 'format'
  | 'toggle-diff'
  | 'focus-url'
  | 'toggle-palette'
  | 'toggle-sidebar'
  | 'undo'
  | 'redo'
  | 'select-all'
  | 'whats-new'
  | 'check-updates';

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

  listResources(): Promise<ResourceEntry[]>;
  getResourceContent(url: string): Promise<ResourceContent>;

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

  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  getWorkspaces(): Promise<WorkspacesState>;
  /** Site icons (data URLs) by workspace id, for those that have one. */
  getWorkspaceFavicons(): Promise<Record<string, string>>;
  /** Adds an empty workspace (without switching to it). */
  createWorkspace(): Promise<Workspace>;
  updateWorkspace(id: string, patch: WorkspacePatch): Promise<Workspace>;
  /** Deletes a workspace that isn't the active one, with its overrides and drafts. */
  deleteWorkspace(id: string): Promise<void>;
  /**
   * Makes `id` the active workspace: the page leaves for its last page, and its
   * overrides apply. Close the tabs first (their drafts written); then reopen
   * the ones `getSession` lists.
   */
  switchWorkspace(id: string): Promise<void>;

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
