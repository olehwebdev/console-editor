import type { EngineEvent, Override, ResourceEntry, Settings, WorkerType } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import type { HeaderEntry } from '../transform';

export interface FetchPattern {
  urlPattern: string;
  resourceType?: string;
  requestStage: 'Request' | 'Response';
}

export interface EngineOptions {
  transport: CdpTransport;
  /** Current overrides (with content). Called on every intercepted request. */
  getOverrides(): Override[];
  getSettings(): Settings;
  emit(event: EngineEvent): void;
  /** Fetches a URL outside the page (used when the page no longer holds a body). */
  fallbackFetch?(url: string): Promise<string>;
  /**
   * Set for engines attached to a cross-site iframe session: `id` is stamped on
   * its resources and `navigated` events so the UI can scope them to that
   * session, `depth` is the iframe's nesting depth (1 = direct child of the page).
   */
  iframe?: { id: string; depth: number };
  /**
   * Set for engines attached to a worker session. Workers have no Page domain.
   * Dedicated workers and worklets have no Fetch domain either: what they load
   * is paused on the session of the frame that owns them, and only reported
   * (and readable) on theirs.
   */
  worker?: WorkerInfo;
  /**
   * Network requestId -> id of the override that served it, shared by every
   * session of a page: a dedicated worker's requests are paused (and served) on
   * its frame's session but reported on the worker's own.
   */
  servedBy?: Map<string, string>;
  /**
   * While shared workers are being set up, their first script must wait: a
   * worker that starts before its session intercepts never will. Returns
   * undefined when nothing is pending.
   */
  workerSetups?(): Promise<void> | undefined;
}

export interface WorkerInfo {
  /** Session id: stamped on the worker's resources and `worker-detached`. */
  id: string;
  type: WorkerType;
  /** Equal to the Network requestId of the worker's main script. */
  targetId: string;
  /** The worker's script URL (before redirects); a worklet's document URL. */
  url: string;
  /** Started by another worker: Chromium pauses the first script of such a worker nowhere. */
  nested?: boolean;
  /** For a service worker attached again (the page left its site and came back): what its last session knew. */
  previous?: ServiceWorkerState;
}

/** How a service worker's script was paused, and the override version it was served (`id@updatedAt`, '' for the live file). */
export interface ServedScript {
  resourceType: string;
  version: string;
}

/** What a service worker's session learnt about its installed scripts, kept for its next session. */
export interface ServiceWorkerState {
  url: string;
  installSeen: boolean;
  servedScripts: ReadonlyMap<string, ServedScript>;
  /** Its listed scripts. */
  scripts: ResourceEntry[];
}

/** A CDP command and its params, sent as they are. */
export type CdpCommand = [method: string, params: Record<string, unknown>];

/** What a kind of worker's session offers and takes. */
export interface WorkerSession {
  /**
   * It has a Fetch domain. Dedicated workers and worklets don't: what they
   * load is paused on the session of the frame that owns them.
   */
  fetch: boolean;
  /**
   * Its scripts are paused, and listed from the pause, too. It may start before
   * its session reports anything: a shared worker isn't paused as it starts, and
   * another debugger (DevTools, a test driver) may resume a service worker early.
   */
  pausesScripts: boolean;
  /** The network settings it takes: the page's don't reach what workers load. */
  settings(s: Settings): CdpCommand[];
}

/** What tells why a worker got a file an enabled override matched unmodified. */
export interface MissContext {
  /** The worker was started by another worker. */
  nested: boolean;
  /** The file is the worker's own first script. */
  mainScript: boolean;
  /** The file was paused on the worker's own session (a service worker's). */
  pausedHere: boolean;
}

export interface TrackedResource {
  entry: ResourceEntry;
  requestId: string;
  frameId?: string;
  loaderId?: string;
  /** Hash of the raw upstream body when we rewrote this response (SRI stripped). */
  upstreamHash?: string;
  /** Answered by a service worker, which may have been served an override on its own session. */
  fromServiceWorker?: boolean;
}

/** Subset of `Fetch.requestPaused` params that we use. */
export interface RequestPausedParams {
  requestId: string;
  request: { url: string; method: string };
  resourceType: string;
  networkId?: string;
  responseStatusCode?: number;
  responseErrorReason?: string;
  responseHeaders?: HeaderEntry[];
}

export interface FrameTree {
  frame: { id: string; url: string; parentId?: string };
  childFrames?: FrameTree[];
}
