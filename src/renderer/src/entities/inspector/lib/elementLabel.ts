import type { InspectedElement } from '@common/types';

/** An element as a CSS-like label: `<button#add.primary>`. */
export function elementLabel(element: InspectedElement): string {
  const id = element.id ? `#${element.id}` : '';
  const classes = element.classes.map((name) => `.${name}`).join('');
  return `<${element.tag}${id}${classes}>`;
}
