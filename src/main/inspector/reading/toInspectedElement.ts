import type { InspectedElement } from '../../../shared/types';
import { cleanText } from './cleanText';

/** Most classes shown for an element. */
const MAX_CLASSES = 4;

/** An element's label as the page gave it, checked. */
export function toInspectedElement(raw: unknown): InspectedElement {
  const element = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const classes = Array.isArray(element.classes) ? element.classes.slice(0, MAX_CLASSES).map(cleanText).filter(Boolean) : [];
  return { tag: cleanText(element.tag) || 'element', id: cleanText(element.id), classes };
}
