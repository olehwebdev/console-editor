import type { FileKind, ResourceKind } from '../../../shared/types';
import { DOCUMENT_KIND, FETCH_KIND, FETCH_RESOURCE_TYPES, OTHER_RESOURCE_TYPE, SCRIPT_KIND } from './constants';
import { isKind } from './isKind';

/** CDP resource types we don't list that only overrides of one kind answer: workers load scripts as `Other`. */
const SOLE_KIND = new Map<string, FileKind>([[OTHER_RESOURCE_TYPE, SCRIPT_KIND]]);

/**
 * Whether an override of `kind` may answer a request of this CDP resource type (see `findOverride`).
 * A response override answers fetch() and XHR only, never a file the page loads.
 */
export function answersKind(kind: ResourceKind, resourceType: string): boolean {
  if (kind === FETCH_KIND) return FETCH_RESOURCE_TYPES.has(resourceType);
  const sole = isKind(resourceType) ? resourceType : SOLE_KIND.get(resourceType);
  return sole ? kind === sole : kind !== DOCUMENT_KIND;
}
