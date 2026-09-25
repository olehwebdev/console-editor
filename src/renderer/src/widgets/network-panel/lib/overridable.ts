import type { NetworkRequest } from '@common/types';
import { requestGroup, TEXT_RESPONSE } from '@/entities/network-request';
import { UNANSWERED_TYPES } from './constants';

/**
 * Whether a request's response can open as a response override: one the page's code asked for, not
 * a stream or preflight, that came back as text (JSON, most often). One an override answered opens that.
 */
export function overridable(request: NetworkRequest): boolean {
  if (request.overrideId) return true;
  if (requestGroup(request) !== 'fetch' || UNANSWERED_TYPES.has(request.type) || request.state !== 'done') return false;
  return !request.mimeType || TEXT_RESPONSE.test(request.mimeType);
}
