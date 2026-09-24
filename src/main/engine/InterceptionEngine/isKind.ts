import type { ResourceKind } from '../../../shared/types';
import { RESOURCE_KINDS } from '../../../shared/types';

/** Whether a CDP resource type is one of the kinds we list and override. */
export function isKind(type: string | undefined): type is ResourceKind {
  return !!type && (RESOURCE_KINDS as readonly string[]).includes(type);
}
