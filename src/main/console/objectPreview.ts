import { ELLIPSIS, PLAIN_OBJECT } from './constants';
import { propertyText } from './propertyText';
import type { ObjectPreview } from './types';

/** An object's preview: `{sku: 42, name: "cart"}`, or `Order {id: 7}` for an instance of a class. */
export function objectPreview(preview: ObjectPreview): string {
  const items = preview.properties.map((p) => `${p.name}: ${propertyText(p)}`);
  if (preview.overflow) items.push(ELLIPSIS);
  const body = `{${items.join(', ')}}`;
  return preview.description && preview.description !== PLAIN_OBJECT ? `${preview.description} ${body}` : body;
}
