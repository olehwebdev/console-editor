import type { ComponentLink, InspectFramework } from '@common/types';
import type { OriginalPlace } from '../model/store';
import { NAMED_BY_FUNCTION } from './constants';

/** What to call a component of a chain, given its function's original: the name the original gives it when the page's is its function's (minified), else the page's. */
export function linkNameAt(link: Pick<ComponentLink, 'name'>, framework: InspectFramework | null, original: OriginalPlace | null | undefined): string {
  return framework && NAMED_BY_FUNCTION[framework] && original?.name ? original.name : link.name;
}
