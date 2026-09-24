// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/**
 * Focuses the mounted stack's front card; set by the stack while it is mounted.
 * Mutated in place (importers can't reassign another module's bindings).
 */
export const focusHost: { current: (() => boolean) | null } = { current: null };
