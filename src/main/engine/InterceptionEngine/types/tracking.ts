import type { ResourceEntry } from '../../../../shared/types';
import type { CdpTransport } from '../../cdp';
import type { FrameTracker } from '../FrameTracker';
import type { NavigationTracker } from '../NavigationTracker';
import type { OverrideMatcher } from '../OverrideMatcher';
import type { ResourceTracker } from '../ResourceTracker';
import type { WorkerScripts } from '../WorkerScripts';
import type { WorkerSettingsApplier } from '../WorkerSettingsApplier';
import type { EngineOptions } from './options';

export interface TrackedResource {
  entry: ResourceEntry;
  requestId: string;
  frameId?: string;
  loaderId?: string;
  /** Hash of the raw upstream body when we rewrote this response (SRI stripped). */
  upstreamHash?: string;
  /** Answered by a service worker, which may have been served an override on its own session. */
  fromServiceWorker?: boolean;
  /**
   * The source map the upstream response named in its headers. For a file served from an override,
   * taken before the override replaced its headers.
   */
  sourceMap?: string;
}

/** What a {@link ResourceTracker} works with. */
export interface ResourceTrackerContext {
  frames: FrameTracker;
  navigation: NavigationTracker;
  /** Finds the overrides a response arrived without (to report them). */
  matcher: OverrideMatcher;
  opts: Pick<EngineOptions, 'emit' | 'iframe' | 'servedBy' | 'upstreamSourceMaps' | 'getRules'>;
  /** Set on a worker session: the worker's own scripts. */
  worker?: WorkerScripts;
}

/** What the handler of paused requests works with. */
export interface PausedRequestContext {
  cdp: CdpTransport;
  opts: Pick<EngineOptions, 'getOverrides' | 'getRules' | 'getSettings' | 'getBreakpoints' | 'getOverrideBase' | 'hold' | 'emit' | 'iframe' | 'workerSetups'>;
  /** What the requests this session holds are held by: let go of when it goes. */
  owner: object;
  matcher: OverrideMatcher;
  /** The session's frames: which is the page, and the URL of the one that made a request. */
  frames: FrameTracker;
  /** Told which requests were answered by an override or rewritten. */
  resources: ResourceTracker;
  /** Set on a worker session: the worker's own scripts. */
  worker?: WorkerScripts;
}

/** Applies a session's settings and keeps its `Fetch` patterns current. */
export interface SessionSettings {
  /** Re-applies the settings and interception patterns. */
  apply(): Promise<void>;
  /** Recomputes the interception patterns (the overrides or rules changed). */
  refresh(): Promise<void>;
  /** Stops pausing requests, without waiting for (or minding) the answer. */
  stop(): void;
}

/** What committing a root frame's navigation works with. */
export interface NavigationContext {
  frames: FrameTracker;
  navigation: NavigationTracker;
  resources: ResourceTracker;
  opts: Pick<EngineOptions, 'emit' | 'iframe'>;
}

/** What setting up a page or iframe session works with. */
export interface FrameSessionContext extends NavigationContext {
  cdp: CdpTransport;
  /** Gets the session's unsubscribers. */
  disposers: Array<() => void>;
  applySettings(): Promise<void>;
}

/** What setting up a worker session works with. */
export interface WorkerSessionContext {
  cdp: CdpTransport;
  resources: ResourceTracker;
  worker: WorkerScripts;
  settings: WorkerSettingsApplier;
  /** Gets the session's unsubscribers. */
  disposers: Array<() => void>;
}
