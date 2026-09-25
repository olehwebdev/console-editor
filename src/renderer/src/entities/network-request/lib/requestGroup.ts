import type { NetworkRequest } from '@common/types';
import { GROUP_OF_TYPE, type RequestGroup } from './constants';

/** The filter group a request belongs to, by its `Network` type. */
export function requestGroup(request: Pick<NetworkRequest, 'type'>): RequestGroup {
  return Object.hasOwn(GROUP_OF_TYPE, request.type) ? GROUP_OF_TYPE[request.type]! : 'other';
}
