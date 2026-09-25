import type { ComponentLink, InspectFramework } from '@common/types';
import type { OriginalPlace } from '../model/store';
import { NAMED_BY_FUNCTION } from './constants';
import { locationKey } from './locationKey';

/** What to call a component of a chain: the name its original gives it when the page's is its function's (minified), else the page's. */
export function linkName(link: ComponentLink, framework: InspectFramework | null, origins: Readonly<Record<string, OriginalPlace | null>>): string {
  const original = link.location ? origins[locationKey(link.location)] : undefined;
  return framework && NAMED_BY_FUNCTION[framework] && original?.name ? original.name : link.name;
}
