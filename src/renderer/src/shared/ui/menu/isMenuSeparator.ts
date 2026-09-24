import type { MenuItem, MenuSeparator } from './types';

export function isMenuSeparator(item: MenuItem): item is MenuSeparator {
  return item.separator === true;
}
