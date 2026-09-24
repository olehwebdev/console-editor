import type { EngineEvent, Override, ResourceEntry, Settings } from '../../../shared/types';
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
