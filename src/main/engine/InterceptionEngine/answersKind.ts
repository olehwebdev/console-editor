import type { ResourceKind } from '../../../shared/types';
import { DOCUMENT_KIND } from './constants';
import { isKind } from './isKind';

/** Whether an override of `kind` may answer a request of this CDP resource type (see `findOverride`). */
export function answersKind(kind: ResourceKind, resourceType: string): boolean {
  return isKind(resourceType) ? kind === resourceType : kind !== DOCUMENT_KIND;
}
