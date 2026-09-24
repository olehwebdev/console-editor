// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { focusableIn } from './focusableIn';

/** Focuses the nearest other card that can take it: the ones behind `card` first, then those in front. */
export function focusNeighbour(list: HTMLOListElement | null, card: HTMLElement): boolean {
  const cards = Array.from(list?.children ?? []);
  const at = cards.indexOf(card);
  const order = at < 0 ? cards : [...cards.slice(at + 1), ...cards.slice(0, at).reverse()];
  for (const other of order) {
    const target = other === card ? null : focusableIn(other);
    if (target) {
      target.focus({ preventScroll: true });
      return true;
    }
  }
  return false;
}
