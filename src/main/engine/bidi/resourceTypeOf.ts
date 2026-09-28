import { OTHER_RESOURCE, RESOURCE_TYPES } from './constants';
import type { BidiRequestData } from './types';

/** The CDP resource type the engine's matching knows for a BiDi request (see {@link RESOURCE_TYPES}). */
export function resourceTypeOf({ destination, initiatorType }: BidiRequestData): string {
  const key = destination || initiatorType || '';
  return Object.hasOwn(RESOURCE_TYPES, key) ? RESOURCE_TYPES[key] : OTHER_RESOURCE;
}
