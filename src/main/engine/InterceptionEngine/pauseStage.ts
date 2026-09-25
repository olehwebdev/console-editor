import type { RequestPausedParams, RequestStage } from './types';

/** The stage a request paused at: a Response-stage pause has a status code, or an error reason instead. */
export function pauseStage(p: Pick<RequestPausedParams, 'responseStatusCode' | 'responseErrorReason'>): RequestStage {
  return p.responseStatusCode !== undefined || p.responseErrorReason !== undefined ? 'Response' : 'Request';
}
