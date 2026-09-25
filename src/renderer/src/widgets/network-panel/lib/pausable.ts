import type { NetworkRequest } from '@common/types';
import { requestGroup } from '@/entities/network-request';
import { UNANSWERED_TYPES } from './constants';

/** Whether a breakpoint can stop requests like this one: fetch() and XHR, not their preflights or event streams. */
export function pausable(request: NetworkRequest): boolean {
  return requestGroup(request) === 'fetch' && !UNANSWERED_TYPES.has(request.type);
}
