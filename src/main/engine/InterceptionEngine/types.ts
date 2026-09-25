import type { EngineEvent, Override, ResourceEntry, Rule, Settings } from '../../../shared/types';
import type { CdpTransport } from '../cdp';
import type { HeaderEntry } from '../transform';

/** The Fetch stage a request pauses at: before it is sent, or once its response headers arrived. */
export type RequestStage = 'Request' | 'Response';

export interface FetchPattern {
  urlPattern: string;
  resourceType?: string;
  requestStage: RequestStage;
}

export interface EngineOptions {
  transport: CdpTransport;
  /** Current overrides (with content). Called on every intercepted request. */
  getOverrides(): Override[];
  /** The active workspace's rules, oldest first. Called on every paused request: a cheap in-memory read. */
  getRules(): readonly Rule[];
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

/** Subset of `Fetch.requestPaused` params that we use. At the Response stage iff it has a status or an error reason. */
export interface RequestPausedParams {
  requestId: string;
  /** `headers`: Network.Headers as sent (names in any case). */
  request: { url: string; method: string; headers?: Record<string, string> };
  resourceType: string;
  /** The frame that made the request; for a navigation, the frame navigating. */
  frameId?: string;
  networkId?: string;
  responseStatusCode?: number;
  responseStatusText?: string;
  responseErrorReason?: string;
  responseHeaders?: HeaderEntry[];
}

/** A Response-stage pause that carries a whole response head (see `hasResponseHead`). */
export type PausedResponse = RequestPausedParams & Required<Pick<RequestPausedParams, 'responseStatusCode' | 'responseHeaders'>>;

export interface FrameTree {
  frame: { id: string; url: string; parentId?: string };
  childFrames?: FrameTree[];
}
