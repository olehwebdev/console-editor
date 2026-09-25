import type { ComponentLink, InspectFramework } from '@common/types';
import type { OriginalPlace } from '../model/store';
import { linkNameAt } from './linkNameAt';
import { locationKey } from './locationKey';

/** What to call a component of a chain: the name its original gives it when the page's is its function's (minified), else the page's. */
export function linkName(link: ComponentLink, framework: InspectFramework | null, origins: Readonly<Record<string, OriginalPlace | null>>): string {
  return linkNameAt(link, framework, link.location ? origins[locationKey(link.location)] : undefined);
}
