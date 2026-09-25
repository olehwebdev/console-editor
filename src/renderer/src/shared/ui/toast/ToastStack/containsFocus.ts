// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/** Whether focus is on `el` or inside it. */
export function containsFocus(el: Element | null): boolean {
  const focused = document.activeElement;
  return !!focused && !!el?.contains(focused);
}
