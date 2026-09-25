import type { HeaderEntry } from '../../transform';

/** The Fetch stage a request pauses at: before it is sent, or once its response headers arrived. */
export type RequestStage = 'Request' | 'Response';

export interface FetchPattern {
  urlPattern: string;
  resourceType?: string;
  requestStage: RequestStage;
}

/** Subset of `Fetch.requestPaused` params that we use. At the Response stage iff it has a status or an error reason. */
export interface RequestPausedParams {
  requestId: string;
  /** `headers`: Network.Headers as sent (names in any case); `postData`: its body, when it is text (probed: in full at 200 KB). */
  request: { url: string; method: string; headers?: Record<string, string>; postData?: string };
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
