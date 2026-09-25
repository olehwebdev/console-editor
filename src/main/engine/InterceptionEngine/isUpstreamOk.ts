import { HTTP_REDIRECTION, HTTP_SUCCESSFUL } from '../constants';
import type { RequestPausedParams } from './types';

/** Whether upstream answered a paused request with a success (2xx) rather than an error or a failure. */
export function isUpstreamOk(p: RequestPausedParams): boolean {
  return (
    !p.responseErrorReason &&
    p.responseStatusCode !== undefined &&
    p.responseStatusCode >= HTTP_SUCCESSFUL &&
    p.responseStatusCode < HTTP_REDIRECTION
  );
}
