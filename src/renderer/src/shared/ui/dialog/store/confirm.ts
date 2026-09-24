import { confirmState } from './confirmState';
import { emit } from './emit';
import { plainText } from './plainText';
import type { ConfirmOptions } from './types';

/**
 * Promise-based replacement for `window.confirm`. Resolves `true` on confirm,
 * `false` on cancel / Esc / backdrop. Requests queue up if one is already open.
 * Needs one `<ConfirmDialog/>` mounted; without it, falls back to the native dialog.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (confirmState.hosts.length === 0) {
    const body = plainText(options.body);
    return Promise.resolve(window.confirm(body ? `${options.title}\n\n${body}` : options.title));
  }
  return new Promise<boolean>((resolve) => {
    confirmState.queue = [...confirmState.queue, { ...options, id: ++confirmState.seed, resolve }];
    emit();
  });
}
