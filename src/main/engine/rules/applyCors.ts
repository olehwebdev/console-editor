import { isSuccessful } from '../transform';
import {
  ALLOW_CREDENTIALS,
  ALLOW_CREDENTIALS_HEADER,
  ALLOW_HEADERS_HEADER,
  ALLOW_METHODS_HEADER,
  ALLOW_ORIGIN_HEADER,
  ANY_ORIGIN,
  CORS_RESPONSE_HEADERS,
  EXPOSE_HEADERS_HEADER,
  MAX_AGE_HEADER,
  PREFLIGHT_MAX_AGE,
  PREFLIGHT_STATUS,
  REQUEST_HEADERS_HEADER,
  REQUEST_METHOD_HEADER,
} from './constants';
import { corsOriginOf } from './corsOriginOf';
import { exposeHeaders } from './exposeHeaders';
import { isPreflight } from './isPreflight';
import { requestHeader } from './requestHeader';
import type { PausedRequest, ResponseHead } from './types';

/**
 * Lets the requesting page read a response cross-origin. Upstream's CORS
 * headers are replaced: the requesting origin is allowed with credentials (a
 * credentialed request refuses `*`), and every header is exposed. A preflight
 * is allowed the method and headers it asked for, uncached, and succeeds even
 * when upstream refused it (a 404 or 405 preflight fails whatever it carries).
 */
export function applyCors(head: ResponseHead, request: PausedRequest): ResponseHead {
  const origin = corsOriginOf(request);
  const headers = head.headers.filter((h) => !CORS_RESPONSE_HEADERS.has(h.name.toLowerCase()));
  headers.push({ name: ALLOW_ORIGIN_HEADER, value: origin });
  if (origin !== ANY_ORIGIN) headers.push({ name: ALLOW_CREDENTIALS_HEADER, value: ALLOW_CREDENTIALS });
  const method = requestHeader(request.headers, REQUEST_METHOD_HEADER);
  if (method === undefined || !isPreflight(request)) {
    const exposed = exposeHeaders(head.headers);
    if (exposed) headers.push({ name: EXPOSE_HEADERS_HEADER, value: exposed });
    return { status: head.status, headers };
  }
  headers.push({ name: ALLOW_METHODS_HEADER, value: method });
  const requested = requestHeader(request.headers, REQUEST_HEADERS_HEADER);
  if (requested) headers.push({ name: ALLOW_HEADERS_HEADER, value: requested });
  headers.push({ name: MAX_AGE_HEADER, value: PREFLIGHT_MAX_AGE });
  return { status: isSuccessful(head.status) ? head.status : PREFLIGHT_STATUS, headers };
}
