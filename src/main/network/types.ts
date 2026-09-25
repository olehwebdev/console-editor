import type { AppEvent, HttpHeader, NetworkRequest, WorkerType } from '../../shared/types';
import type { CdpTransport } from '../engine/cdp';
import type { NetworkBatch } from './NetworkBatch';
import type { RequestLog } from './RequestLog';

export interface NetworkLogOptions {
  /** The page's transport: it carries every session's events (a child session's with its id). */
  transport: CdpTransport;
  send(event: AppEvent): void;
}

/** A row and what the log keeps about it besides. */
export interface TrackedRequest {
  row: NetworkRequest;
  /** The session that reported it; undefined for the page's own. */
  sessionId?: string;
  /** Its `Network` request id on that session. */
  requestId: string;
  /** When it was sent, in CDP's monotonic seconds (durations are measured from it). */
  sentAt: number;
  requestHeaders: HttpHeader[];
  responseHeaders: HttpHeader[];
  /** The headers as they went over the wire (cookies included), when the `ExtraInfo` events told. */
  wireRequestHeaders?: HttpHeader[];
  wireResponseHeaders?: HttpHeader[];
  statusText: string;
  /** Its body, when `requestWillBeSent` carried it (or it was read since). */
  postData?: string;
}

/** What the event handlers work on. */
export interface NetworkLogContext {
  log: RequestLog;
  batch: NetworkBatch;
  /** The top-level page's load count, and its main frame (learnt from its first commit). */
  page: { load: number; mainFrameId?: string };
  /** Worker sessions by session id: the kind of worker and its script URL. */
  workers: Map<string, { type: WorkerType; url: string }>;
  /** Held ids by request id, for requests a breakpoint holds before `requestWillBeSent` lists them (the two can come in either order). */
  heldMarks: Map<string, string>;
}

/** Handles one CDP event for the log; `sessionId` is undefined for the page's own session. */
export type NetworkEventHandler = (ctx: NetworkLogContext, params: any, sessionId: string | undefined) => void;

/** Subset of `Network.requestWillBeSent` params that the log reads. */
export interface RequestWillBeSent {
  requestId: string;
  loaderId?: string;
  frameId?: string;
  type?: string;
  timestamp: number;
  wallTime: number;
  request: { url: string; method: string; headers?: Record<string, string>; hasPostData?: boolean; postData?: string };
  redirectResponse?: ReceivedResponse;
}

/** Subset of `Network.Response` that the log reads. */
export interface ReceivedResponse {
  url: string;
  status: number;
  statusText?: string;
  mimeType: string;
  headers?: Record<string, string>;
  fromDiskCache?: boolean;
  fromPrefetchCache?: boolean;
  fromServiceWorker?: boolean;
}

/** Subset of `Network.responseReceived` params that the log reads. */
export interface ResponseReceived {
  requestId: string;
  type?: string;
  response: ReceivedResponse;
}

/** Subset of `Network.loadingFinished` and `Network.loadingFailed` params that the log reads. */
export interface LoadingEnded {
  requestId: string;
  timestamp: number;
  encodedDataLength?: number;
  errorText?: string;
  canceled?: boolean;
  blockedReason?: string;
}

/** Subset of the `ExtraInfo` events' params: the headers as they went over the wire (cookies included). */
export interface ExtraInfo {
  requestId: string;
  headers: Record<string, string>;
  statusCode?: number;
}

/** What the page's held requests report to. */
export interface HeldRequestsOptions {
  /** The page's transport: a held request the page gives up on is let go. */
  transport: CdpTransport;
  send(event: AppEvent): void;
  /** Marks a request's row as held (by this id), or not any more (undefined). */
  mark(networkId: string, heldId: string | undefined): void;
}
