import type { InspectedComponent } from '@common/types';
import type { OriginalPlace } from '../model/store';
import { elementLabel } from './elementLabel';
import { linkName } from './linkName';

/** What to call the component a pick shows: its name (its original's when the page's is minified), else the element's label. */
export function componentTitle(component: InspectedComponent, origins: Readonly<Record<string, OriginalPlace | null>>): string {
  const link = component.chain[component.depth];
  return link ? linkName(link, component.framework, origins) : elementLabel(component.element);
}
