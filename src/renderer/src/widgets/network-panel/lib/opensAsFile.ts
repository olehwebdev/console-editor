import type { NetworkRequest } from '@common/types';
import { requestGroup } from '@/entities/network-request';
import { FILE_GROUPS } from './constants';

/** Whether a request fetched a file the editor opens (a script, a stylesheet, a page). */
export function opensAsFile(request: NetworkRequest): boolean {
  return FILE_GROUPS.has(requestGroup(request));
}
