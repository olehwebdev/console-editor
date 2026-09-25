import type { ResourceKind } from '../../../shared/types';
import { DOCUMENT_KIND, OTHER_RESOURCE_TYPE, SCRIPT_KIND } from './constants';
import { isKind } from './isKind';

/** CDP resource types we don't list that only overrides of one kind answer: workers load scripts as `Other`. */
const SOLE_KIND = new Map<string, ResourceKind>([[OTHER_RESOURCE_TYPE, SCRIPT_KIND]]);

/** Whether an override of `kind` may answer a request of this CDP resource type (see `findOverride`). */
export function answersKind(kind: ResourceKind, resourceType: string): boolean {
  const sole = isKind(resourceType) ? resourceType : SOLE_KIND.get(resourceType);
  return sole ? kind === sole : kind !== DOCUMENT_KIND;
}
