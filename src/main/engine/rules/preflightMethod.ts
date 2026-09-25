import { REQUEST_METHOD_HEADER } from './constants';
import { requestHeader } from './requestHeader';
import type { PausedRequest } from './types';

/** The method a CORS preflight asks to use (its `Access-Control-Request-Method`), or undefined for any other request. */
export function preflightMethod(request: PausedRequest): string | undefined {
  return requestHeader(request.headers, REQUEST_METHOD_HEADER);
}
