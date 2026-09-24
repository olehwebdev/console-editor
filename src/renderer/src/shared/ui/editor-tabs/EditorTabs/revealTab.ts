// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/** Scrolls smaller than this (px) aren't worth making. */
const MIN_SCROLL = 0.5;
/** Room (px) kept between a tab scrolled into view and the strip's edge. */
const REVEAL_PAD = 20;

/** Scrolls only the strip (never ancestors) so `el` is fully visible, clear of the edge fades. */
export function revealTab(scroller: HTMLElement | null, el: HTMLElement | null, reduce: boolean) {
  if (!scroller || !el) return;
  const frame = scroller.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  const delta =
    box.left < frame.left + REVEAL_PAD
      ? box.left - frame.left - REVEAL_PAD
      : box.right > frame.right - REVEAL_PAD
        ? box.right - frame.right + REVEAL_PAD
        : 0;
  if (Math.abs(delta) > MIN_SCROLL) scroller.scrollBy({ left: delta, behavior: reduce ? 'instant' : 'smooth' });
}
