import type { PropertyPreview } from './types';

/** One property in a preview: strings quoted, as DevTools shows them. */
export function propertyText(p: PropertyPreview): string {
  const value = p.value ?? p.type;
  return p.type === 'string' ? JSON.stringify(value) : value;
}
