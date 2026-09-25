import type { HttpHeader } from './network';
import type { HeaderEdit } from './rules';
import type { UrlMatcher } from './overrides';

/** Where a breakpoint stops a request: before it is sent, or once its response has arrived. */
export const BREAKPOINT_STAGES = ['request', 'response'] as const;

export type BreakpointStage = (typeof BREAKPOINT_STAGES)[number];

/** A workspace's way of stopping the page's fetch() and XHR requests, to look at and change them. */
export interface Breakpoint {
  id: string;
  match: UrlMatcher;
  /** An HTTP method in upper case, or `*` for any. A CORS preflight is never stopped. */
  method: string;
  stage: BreakpointStage;
  enabled: boolean;
}

/** A held request's response, at the response stage. */
export interface HeldResponse {
  status: number;
  statusText: string;
  headers: HttpHeader[];
  /** Its body as text; undefined when it isn't text, or couldn't be read. */
  body?: string;
}

/** A request a breakpoint stopped, waiting for what to do with it. */
export interface HeldRequest {
  /** Unique for the app's run. */
  id: string;
  breakpointId: string;
  stage: BreakpointStage;
  url: string;
  method: string;
  /** As it was to be sent. */
  requestHeaders: HttpHeader[];
  /** The request's body, when it has one as text. */
  requestBody?: string;
  /** Response stage only. */
  response?: HeldResponse;
  /** When it stopped, in ms since the epoch. */
  heldAt: number;
}

/** The network errors a held request can fail with, as CDP's `Network.ErrorReason` names them. */
export const FAIL_REASONS = ['Failed', 'TimedOut', 'ConnectionRefused', 'ConnectionReset', 'InternetDisconnected', 'NameNotResolved', 'Aborted'] as const;

export type FailReason = (typeof FAIL_REASONS)[number];

/**
 * What to do with a held request:
 * - continue: let it go as it would have (sent to the server, or its response to the page)
 * - send:     request stage: send it with this method, URL, header changes (on the request's) and body
 * - respond:  answer the page with this status, header changes and body, without sending the request
 *             (request stage: on top of a JSON response's headers) or instead of its response
 *             (response stage: on top of the response's headers)
 * - fail:     fail it as a network error would
 */
export type HeldAction =
  | { type: 'continue' }
  | { type: 'send'; url: string; method: string; headers: HeaderEdit[]; body?: string }
  | { type: 'respond'; status: number; headers: HeaderEdit[]; body: string }
  | { type: 'fail'; reason: FailReason };

export type HeldActionType = HeldAction['type'];
