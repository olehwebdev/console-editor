import type { WorkerType } from './workers';

/** A header as it was sent or received. */
export interface HttpHeader {
  name: string;
  value: string;
}

/** Where a request stands: waiting for its last byte, finished, or failed (blocked, cancelled, offline). */
export const NETWORK_REQUEST_STATES = ['pending', 'done', 'failed'] as const;

export type NetworkRequestState = (typeof NETWORK_REQUEST_STATES)[number];

/** A request the page, one of its iframes or one of its workers sent, as the Network panel lists it (SPEC §6.10). */
export interface NetworkRequest {
  /** Unique for the app's run. */
  id: string;
  url: string;
  method: string;
  /** As CDP's `Network` domain reports it: Document, Stylesheet, Script, Image, Font, Fetch, XHR, EventSource, Ping, Preflight, Other… */
  type: string;
  state: NetworkRequestState;
  /** The response's status: 0 until it arrives, or when none did. */
  status: number;
  mimeType: string;
  /** Bytes received, headers included, once it finished. */
  size?: number;
  /** When it was sent, in ms since the epoch. */
  startedAt: number;
  /** ms from sending to its last byte (or its failure). */
  duration?: number;
  /** Why it failed: the network error (`net::ERR_BLOCKED_BY_CLIENT`…), or that it was cancelled. */
  error?: string;
  /** The frame that sent it (unset for a worker's): the console's frame, for its chip. */
  frameId?: string;
  /** Set when a worker sent it: the kind of worker and its script URL. */
  worker?: { type: WorkerType; url: string };
  /** The override that answered it. */
  overrideId?: string;
  /** Set while a breakpoint holds it: the held request's id. */
  heldId?: string;
  /** A service worker answered it, or the HTTP cache: it never reached the network. */
  fromServiceWorker?: boolean;
  fromCache?: boolean;
  /** It carried a body (a POST's, say), read with `getNetworkRequest`. */
  hasBody: boolean;
  /** The GraphQL operation its body names. */
  operation?: string;
  /** A WebSocket's: how many messages it has sent and received so far (`getNetworkMessages` reads them). */
  messages?: number;
  /**
   * The load of the top-level page it belongs to: when another page loads, the rows of the earlier
   * ones go, unless the panel keeps them.
   */
  pageLoad: number;
}

/** What `getNetworkRequest` adds to a row. */
export interface NetworkRequestDetail {
  requestHeaders: HttpHeader[];
  responseHeaders: HttpHeader[];
  /** The request's body as text; undefined when it had none, or it can't be read any more. */
  body?: string;
  statusText: string;
}

/** Why a response's body can't be read. */
export const NETWORK_BODY_GAPS = ['pending', 'failed', 'stream', 'gone'] as const;

/**
 * - pending: it hasn't finished arriving
 * - failed:  there was no response
 * - stream:  an event stream, never read while it is open (reading one ends it for the page)
 * - gone:    Chromium no longer holds it (its buffer filled up, or its frame or worker went away)
 */
export type NetworkBodyGap = (typeof NETWORK_BODY_GAPS)[number];

/** A response's body, as `getNetworkResponseBody` reads it. */
export type NetworkBody = { available: true; text: string; binary: boolean } | { available: false; gap: NetworkBodyGap };

/** A WebSocket's messages from one on, as `getNetworkMessages` reads them. */
export interface SocketMessages {
  /** The number of the first one here, counting every message the socket ever had from 0. */
  first: number;
  messages: SocketMessage[];
}

/** Which way a WebSocket message went. */
export type SocketDirection = 'sent' | 'received';

/** A message a WebSocket sent or received, as the Network panel shows it. */
export interface SocketMessage {
  direction: SocketDirection;
  /** When, in ms since the epoch. */
  at: number;
  /** A binary message: `data` holds its bytes as base64. */
  binary: boolean;
  /** Its text, cut at `MAX_SOCKET_MESSAGE_CHARS`. */
  data: string;
  /** Its length before any cut: characters of text, or bytes. */
  length: number;
  truncated?: boolean;
}

/** What a HAR import made: response overrides, and how many entries it left out (not fetch/XHR, no text body, an earlier response to the same request). */
export interface HarImport {
  created: number;
  skipped: number;
}
