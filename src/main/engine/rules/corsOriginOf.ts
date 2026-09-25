import { ANY_ORIGIN, ORIGIN_REQUEST_HEADER } from './constants';
import { httpOriginOf } from './httpOriginOf';
import { requestHeader } from './requestHeader';
import type { PausedRequest } from './types';

/**
 * The origin a CORS rule allows: the request's Origin header, else the origin
 * of the frame that made it, else any origin (which credentialed requests refuse).
 */
export function corsOriginOf(request: PausedRequest): string {
  return requestHeader(request.headers, ORIGIN_REQUEST_HEADER) || httpOriginOf(request.frameUrl) || ANY_ORIGIN;
}
