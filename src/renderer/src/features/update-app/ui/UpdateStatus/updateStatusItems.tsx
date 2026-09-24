import { DownloadingItem } from './DownloadingItem';
import { OfferedItem } from './OfferedItem';
import { ReadyItem } from './ReadyItem';
import type { UpdateStatusItems } from './types';

/**
 * The status-bar entry in each state: there is one only while an update is on offer.
 * Annotated rather than `satisfies`: `UpdateStatusItem`'s generic lookup needs the mapped type.
 */
export const UPDATE_STATUS_ITEMS: UpdateStatusItems = {
  available: (state) => <OfferedItem version={state.update.version} />,
  // Still on offer after a failed download or install, when there was one.
  error: (state) => (state.update ? <OfferedItem version={state.update.version} /> : null),
  downloading: (state) => <DownloadingItem percent={state.percent} />,
  ready: (state) => <ReadyItem update={state.update} />,
  disabled: () => null,
  idle: () => null,
  checking: () => null,
  'up-to-date': () => null,
};
