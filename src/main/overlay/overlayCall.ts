import { OVERLAY_GLOBAL } from './constants';

/** A call of the overlay's controller in its world, its arguments written as JSON. */
export function overlayCall(method: string, ...args: string[]): string {
  return `globalThis.${OVERLAY_GLOBAL}.${method}(${args.map((a) => JSON.stringify(a)).join(', ')})`;
}
