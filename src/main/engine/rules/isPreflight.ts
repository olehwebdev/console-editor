import { OPTIONS_METHOD, REQUEST_METHOD_HEADER } from './constants';
import { requestHeader } from './requestHeader';
import type { PausedRequest } from './types';

/** Whether a request is a CORS preflight: an OPTIONS asking which method it may use. */
export function isPreflight(request: PausedRequest): boolean {
  return request.method === OPTIONS_METHOD && requestHeader(request.headers, REQUEST_METHOD_HEADER) !== undefined;
}
