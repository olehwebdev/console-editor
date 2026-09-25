/** The most breakpoints a workspace keeps. */
export const MAX_BREAKPOINTS = 50;

/** A breakpoint's id, as the renderer makes them. */
export const BREAKPOINT_ID = /^[\w-]{1,64}$/;

/** The longest body a held request can be sent or answered with, in characters. */
export const MAX_HELD_BODY = 64 * 1024 * 1024;

/** The URLs a held request can be sent to instead: web addresses only. */
export const SENDABLE_URL = /^https?:\/\//i;
