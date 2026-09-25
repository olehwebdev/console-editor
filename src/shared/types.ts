/**
 * Types shared between the main process, the preload bridge and the renderer.
 * Keep this file free of runtime imports so every bundle can include it.
 */

/** The resource kinds we can override. Values match CDP `Network.ResourceType`. */
export type ResourceKind = 'Document' | 'Script' | 'Stylesheet';

export const RESOURCE_KINDS: readonly ResourceKind[] = ['Document', 'Script', 'Stylesheet'];

/** The match types, in the order the UI offers them. */
export const MATCH_TYPES = ['exact', 'glob', 'regex'] as const;

export type MatchType = (typeof MATCH_TYPES)[number];

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

/**
 * What a rule does to the requests it matches.
 * - block:   fails the request before it is sent, like an ad blocker (net::ERR_BLOCKED_BY_CLIENT)
 * - headers: changes the response's headers
 * - cors:    lets the page read the response cross-origin: allows the requesting origin with
 *            credentials, exposes the headers, and answers its preflight with a success
 */
export const RULE_ACTIONS = ['block', 'headers', 'cors'] as const;

export type RuleAction = (typeof RULE_ACTIONS)[number];

/**
 * Request types a rule can be limited to, named as CDP's Fetch domain reports them. `XHR` is fetch(),
 * XMLHttpRequest and their CORS preflights (also EventSource and <link rel=prefetch>); `Ping` is
 * sendBeacon; `Other` the rest. `Document` covers iframes' pages; the top-level page is never blocked.
 */
export const RULE_RESOURCE_TYPES = ['Document', 'Stylesheet', 'Script', 'Image', 'Font', 'Media', 'XHR', 'Ping', 'Other'] as const;

export type RuleResourceType = (typeof RULE_RESOURCE_TYPES)[number];

/** How a header rule changes a header. */
export const HEADER_OPERATIONS = ['set', 'remove'] as const;

export type HeaderOperation = (typeof HEADER_OPERATIONS)[number];

/** One change to a response's headers. Names match in any case; `set` writes the name as given. */
export interface HeaderEdit {
  operation: HeaderOperation;
  name: string;
  /** What `set` writes; '' for `remove`. */
  value: string;
}

/** What every rule has, whatever it does. */
export interface RuleBase {
  /** 8 hex characters. */
  id: string;
  match: UrlMatcher;
  /** Limits it to these request types; empty = every type. */
  resourceTypes: RuleResourceType[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BlockRule extends RuleBase {
  action: 'block';
}

export interface HeaderRule extends RuleBase {
  action: 'headers';
  /** Applied in order, 1..MAX_HEADER_EDITS. */
  headers: HeaderEdit[];
}

export interface CorsRule extends RuleBase {
  action: 'cors';
}

/** A workspace's way of blocking requests or changing their responses' headers (SPEC §6.3). */
export type Rule = BlockRule | HeaderRule | CorsRule;

export type RuleOf<A extends RuleAction> = Extract<Rule, { action: A }>;

/** A rule's own state: set by the store. */
type RuleStateKey = 'id' | 'enabled' | 'createdAt' | 'updatedAt';

/** Distributes over the union so each action keeps its own fields. */
type WithoutRuleState<R> = R extends Rule ? Omit<R, RuleStateKey> : never;

/** What creating a rule takes. Rules start enabled, in the active workspace. */
export type CreateRuleInput = WithoutRuleState<Rule>;

/** What editing a rule may change. Its action is fixed; `headers` applies to header rules only. */
export interface RulePatch {
  match?: UrlMatcher;
  resourceTypes?: RuleResourceType[];
  enabled?: boolean;
  headers?: HeaderEdit[];
}

export interface ResourceEntry {
  url: string;
  kind: ResourceKind;
  mimeType: string;
  status: number;
  /** Set when the response the page received was served from an override. */
  overrideId?: string;
  /** Set when this rule blocked the request: the page got no response (`status` 0, `mimeType` ''). */
  blockedBy?: string;
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
  /** A rule blocked a request, or changed its response's headers (one event per rule that changed something). */
  | { type: 'rule-applied'; ruleId: string; url: string }
  /** An enabled block rule matched a listed file that arrived anyway (it loaded before the rule applied, or a Chromium interception gap). */
  | { type: 'rule-missed'; ruleId: string; url: string }
  | { type: 'error'; message: string };

/** Everything the main process pushes to the renderer. */
export type AppEvent =
  | EngineEvent
  | { type: 'page-state'; state: PageState }
  /** The active workspace's overrides. */
  | { type: 'overrides-changed'; overrides: OverrideMeta[] }
  /** The active workspace's rules, oldest first. */
  | { type: 'rules-changed'; rules: Rule[] }
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
