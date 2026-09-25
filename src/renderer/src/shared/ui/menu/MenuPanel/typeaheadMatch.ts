// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { MenuAction, MenuItem } from '../types';

/** The enabled row whose label starts with what was typed, searching on from the highlighted row. */
export function typeaheadMatch(buffer: string, items: MenuItem[], enabled: readonly number[], active: number): number | undefined {
  // Repeating one letter cycles through the rows that start with it.
  const cycling = buffer.split('').every((char) => char === buffer[0]);
  const query = cycling ? buffer[0]! : buffer;
  const from = enabled.indexOf(active) + (cycling ? 1 : 0);
  const order = from <= 0 ? enabled : [...enabled.slice(from), ...enabled.slice(0, from)];
  return order.find((index) => (items[index] as MenuAction).label.toLocaleLowerCase().startsWith(query));
}
