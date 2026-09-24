// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/** A floating element's position within [min, max]; with less room than that (max < min), it stays at `min`, the start edge. */
export const clampPosition = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
