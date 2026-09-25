import { CONTENT_TYPE } from '../engine/constants';
import { headerValue } from '../engine/transform';
import { BINARY_OPCODE, MS_PER_SECOND, TEXT_OPCODE } from '../network/constants';
import { HAR_MESSAGE_TYPES, HTTP_VERSION, LOCATION_HEADER, UNKNOWN_SIZE } from './constants';
import { queryOf } from './queryOf';
import type { HarEntry, HarSource } from './types';

/** One logged request as a HAR entry: the headers as they went over the wire when known, and the bodies that could still be read. */
export function harEntryOf({ entry, requestBody, responseBody }: HarSource): HarEntry {
  const { row } = entry;
  const requestHeaders = entry.wireRequestHeaders ?? entry.requestHeaders;
  const responseHeaders = entry.wireResponseHeaders ?? entry.responseHeaders;
  const duration = row.duration ?? 0;
  return {
    startedDateTime: new Date(row.startedAt).toISOString(),
    time: duration,
    request: {
      method: row.method,
      url: row.url,
      httpVersion: HTTP_VERSION,
      headers: requestHeaders,
      queryString: queryOf(row.url),
      cookies: [],
      headersSize: UNKNOWN_SIZE,
      bodySize: requestBody?.length ?? 0,
      ...(requestBody !== undefined ? { postData: { mimeType: headerValue(requestHeaders, CONTENT_TYPE) ?? '', text: requestBody } } : {}),
    },
    response: {
      status: row.status,
      statusText: entry.statusText,
      httpVersion: HTTP_VERSION,
      headers: responseHeaders,
      cookies: [],
      content: { size: responseBody?.length ?? row.size ?? 0, mimeType: row.mimeType, ...(responseBody !== undefined ? { text: responseBody } : {}) },
      redirectURL: headerValue(responseHeaders, LOCATION_HEADER) ?? '',
      headersSize: UNKNOWN_SIZE,
      bodySize: row.size ?? UNKNOWN_SIZE,
    },
    cache: {},
    timings: { send: 0, wait: duration, receive: 0 },
    _resourceType: row.type.toLowerCase(),
    ...(entry.messages
      ? { _webSocketMessages: entry.messages.map((m) => ({ type: HAR_MESSAGE_TYPES[m.direction], time: m.at / MS_PER_SECOND, opcode: m.binary ? BINARY_OPCODE : TEXT_OPCODE, data: m.data })) }
      : {}),
  };
}
