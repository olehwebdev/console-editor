import type { EngineEvent, Override, ResourceEntry, Settings } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import type { HeaderEntry } from '../transform';
import type { FrameTracker } from './FrameTracker';
import type { NavigationTracker } from './NavigationTracker';
import type { OverrideMatcher } from './OverrideMatcher';
import type { ResourceTracker } from './ResourceTracker';

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
}

export interface TrackedResource {
  entry: ResourceEntry;
  requestId: string;
  frameId?: string;
  loaderId?: string;
  /** Hash of the raw upstream body when we rewrote this response (SRI stripped). */
  upstreamHash?: string;
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

/** Subset of `Network.requestWillBeSent` params that we use. */
export interface RequestWillBeSentParams {
  requestId: string;
  loaderId: string;
  frameId?: string;
  type?: string;
  documentURL: string;
  request: { url: string };
}

/** Subset of `Network.responseReceived` params that we use. */
export interface ResponseReceivedParams {
  requestId: string;
  loaderId?: string;
  type?: string;
  frameId?: string;
  response: { url: string; status: number; mimeType: string };
}

/** The frame of a `Page.frameNavigated` event. */
export interface NavigatedFrame {
  id: string;
  parentId?: string;
  url: string;
  loaderId?: string;
}

/** Subset of `Page.frameAttached` params that we use. */
export interface FrameAttachedParams {
  frameId: string;
  parentFrameId?: string;
}

/** Subset of `Page.frameDetached` params that we use. */
export interface FrameDetachedParams {
  frameId: string;
  reason?: string;
}

/** What a {@link ResourceTracker} works with. */
export interface ResourceTrackerContext {
  frames: FrameTracker;
  navigation: NavigationTracker;
  /** Finds the overrides a response arrived without (to report them). */
  matcher: OverrideMatcher;
  opts: Pick<EngineOptions, 'emit' | 'iframe'>;
}

/** What the handler of paused requests works with. */
export interface PausedRequestContext {
  cdp: CdpTransport;
  opts: Pick<EngineOptions, 'getSettings' | 'emit'>;
  matcher: OverrideMatcher;
  /** Told which requests were answered by an override or rewritten. */
  resources: ResourceTracker;
}
