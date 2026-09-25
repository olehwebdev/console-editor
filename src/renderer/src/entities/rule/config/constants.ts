import type { HeaderPreset } from './types';

/** Lets inline scripts, eval and other origins run on a page whose policy header forbids them. */
export const REMOVE_CSP_PRESET: HeaderPreset = {
  label: 'Remove Content-Security-Policy',
  edits: [
    { operation: 'remove', name: 'Content-Security-Policy', value: '' },
    { operation: 'remove', name: 'Content-Security-Policy-Report-Only', value: '' },
  ],
};

/** Lets a page that refuses to be framed load in an iframe. */
export const ALLOW_FRAMING_PRESET: HeaderPreset = {
  label: 'Allow framing (remove X-Frame-Options)',
  edits: [{ operation: 'remove', name: 'X-Frame-Options', value: '' }],
};

/** Tells the page not to keep the response (what the page sees, not the browser's HTTP cache). */
export const NO_STORE_PRESET: HeaderPreset = {
  label: 'Cache-Control: no-store',
  edits: [{ operation: 'set', name: 'Cache-Control', value: 'no-store' }],
};

/** The presets a header rule's editor offers, in menu order. */
export const HEADER_PRESETS: readonly HeaderPreset[] = [REMOVE_CSP_PRESET, ALLOW_FRAMING_PRESET, NO_STORE_PRESET];
