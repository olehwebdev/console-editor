import type { Item } from './types';

/** The objects of a list the page sent, at most `max`; anything else in it is left out. */
export function itemsOf(value: unknown, max: number): Item[] {
  return Array.isArray(value) ? value.slice(0, max).filter((item): item is Item => !!item && typeof item === 'object') : [];
}
