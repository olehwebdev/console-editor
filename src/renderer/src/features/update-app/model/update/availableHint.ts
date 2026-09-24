import type { AvailableUpdate } from '@common/types';

/** How the offered update gets installed, in a sentence. */
export function availableHint(update: AvailableUpdate): string {
  if (update.install === 'manual') return 'Download it, then replace this copy.';
  return update.installsOnQuit
    ? 'It downloads in the background and installs when you restart or quit.'
    : 'It downloads in the background; restarting installs it, after asking for your password.';
}
