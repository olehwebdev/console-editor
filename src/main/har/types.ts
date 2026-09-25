import type { TrackedRequest } from '../network/types';

/** A header, query parameter or cookie as HAR writes it. */
export interface HarPair {
  name: string;
  value: string;
}

/** One request of a HAR 1.2 log, with Chrome DevTools' `_resourceType` and `_webSocketMessages`. */
export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: HarPair[];
    queryString: HarPair[];
    cookies: HarPair[];
    headersSize: number;
    bodySize: number;
    postData?: { mimeType: string; text: string };
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: HarPair[];
    cookies: HarPair[];
    content: { size: number; mimeType: string; text?: string; encoding?: string };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, never>;
  timings: { send: number; wait: number; receive: number };
  _resourceType?: string;
  _webSocketMessages?: Array<{ type: 'send' | 'receive'; time: number; opcode: number; data: string }>;
}

/** A HAR file. */
export interface HarLog {
  log: { version: string; creator: { name: string; version: string }; pages: unknown[]; entries: HarEntry[] };
}

/** A logged request, and its bodies as far as they could still be read. */
export interface HarSource {
  entry: TrackedRequest;
  requestBody?: string;
  responseBody?: string;
}
