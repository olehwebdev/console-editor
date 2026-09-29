import type { AnswerContext } from '../answering';
import type { BidiConnection } from './BidiConnection';

/** Bytes as BiDi carries them: text, or base64. */
export type BidiBytes = { type: 'string'; value: string } | { type: 'base64'; value: string };

/** A header as BiDi carries it. */
export interface BidiHeader {
  name: string;
  value: BidiBytes;
}

/** What `network.beforeRequestSent` and `network.responseStarted` say of a request, as far as interception needs. */
export interface BidiRequestData {
  request: string;
  url: string;
  method: string;
  headers: BidiHeader[];
  /** The size of its body, 0 without one (null when unknown). */
  bodySize?: number | null;
  destination?: string;
  initiatorType?: string | null;
}

export interface BidiNetworkEvent {
  context: string | null;
  isBlocked: boolean;
  request: BidiRequestData;
  response?: { status: number; statusText: string; headers: BidiHeader[] };
}

export type BidiEventHandler = (method: string, params: any) => void;

/** What answering a paused request over BiDi works with: the connection, and the collector keeping bodies, if on. */
export type BidiAnswerContext = AnswerContext & { connection: BidiConnection; collector: string | null };
