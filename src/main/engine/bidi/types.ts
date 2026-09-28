import type { AnswerContext } from '../answering';
import type { BidiConnection } from './BidiConnection';

/** A header as BiDi carries it. */
export interface BidiHeader {
  name: string;
  value: { type: 'string'; value: string } | { type: 'base64'; value: string };
}

/** What `network.beforeRequestSent` and `network.responseStarted` say of a request, as far as interception needs. */
export interface BidiRequestData {
  request: string;
  url: string;
  method: string;
  headers: BidiHeader[];
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

/** What answering a paused request over BiDi works with. */
export type BidiAnswerContext = AnswerContext & { connection: BidiConnection };
