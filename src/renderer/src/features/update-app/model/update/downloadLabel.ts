import type { AvailableUpdate } from '@common/types';

/** The button that starts an update, by how it installs. */
export function downloadLabel(update: AvailableUpdate): string {
  return update.install === 'auto' ? 'Download and install' : 'Download';
}
