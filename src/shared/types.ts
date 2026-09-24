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

export interface Override extends OverrideMeta {
  /** The edited content that is served instead of the upstream file. */
  content: string;
  /** The content the user started editing from (after formatting). Used for the diff view. */
  base: string;
}

/** An override's metadata plus the content that gets served (the diff base is fetched separately). */
export interface OverrideWithContent extends OverrideMeta {
  content: string;
}

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
}

export const DEFAULT_SETTINGS: Settings = {
  autoReloadOnSave: true,
  stripIntegrity: true,
  stripSourceMaps: true,
  bypassServiceWorker: true,
  disableCache: true,
  bypassCSP: false,
  autoFormatMinified: true,
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

/** Events emitted by the interception engine. */
export type EngineEvent =
  /** A document load started: the top-level page (no iframeId) or a cross-site iframe's own frame. */
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
  | { type: 'overrides-changed'; overrides: OverrideMeta[] }
  | { type: 'command'; command: MenuCommand };

/** Menu actions the renderer implements (so they reach Monaco instead of the native text field). */
export type MenuCommand = 'save' | 'format' | 'toggle-diff' | 'focus-url' | 'undo' | 'redo' | 'select-all';

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

  onEvent(listener: (event: AppEvent) => void): () => void;
}
