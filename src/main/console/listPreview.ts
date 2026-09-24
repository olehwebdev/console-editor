import { ELLIPSIS } from './constants';
import { propertyText } from './propertyText';
import type { ObjectPreview } from './types';

/** An array's preview: `[1, "a", {…}]`. */
export function listPreview(preview: ObjectPreview): string {
  const items = preview.properties.map(propertyText);
  if (preview.overflow) items.push(ELLIPSIS);
  return `[${items.join(', ')}]`;
}
