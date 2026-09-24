// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
export const levelOf = (el: HTMLElement) => Number(el.getAttribute('aria-level') ?? '1');
