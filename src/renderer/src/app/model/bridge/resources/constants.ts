import type { ResourceOp } from '@/entities/resource';

/**
 * Frames stop while the window is hidden (minimized, occluded); the store and the queue must not.
 * Hidden windows also throttle timers, so this is a lower bound.
 */
export const HIDDEN_FLUSH_MS = 250;

/** No flush is scheduled: requestAnimationFrame handles are never 0. */
export const NO_FRAME = 0;

/** Top-level navigation: everything goes but what service and shared workers loaded. */
export const RESET_RESOURCE_OP: ResourceOp = { type: 'reset' };
