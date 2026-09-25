import type { EngineOptions } from './types';

/** Reports an error to the user; the window may be gone, which must not stop anything. */
export function reportError(opts: Pick<EngineOptions, 'emit'>, message: string): void {
  try {
    opts.emit({ type: 'error', message });
  } catch {
    // Nobody left to tell.
  }
}
