// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/*
 * Module-level "warm" state shared by every tooltip: once one tooltip is open,
 * or has just closed, the next one opens without the delay, so sliding along a
 * toolbar reads labels instantly. Mutated in place (importers can't reassign
 * another module's bindings).
 */
export const warmth = { openTooltips: 0, warmUntil: 0 };
