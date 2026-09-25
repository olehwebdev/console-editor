import type { HeaderEntry } from '../../transform';

export interface FetchPattern {
  urlPattern: string;
  resourceType?: string;
  requestStage: 'Request' | 'Response';
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
  response: { url: string; status: number; mimeType: string; fromServiceWorker?: boolean; headers?: Record<string, string> };
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
