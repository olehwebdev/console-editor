import type { AppEvent } from '../../shared/types';
import type { PageController } from '../PageController';
import { contentFileId, type OverrideStore } from '../store/OverrideStore';
import { OverrideFileWatcher } from './OverrideFileWatcher';

/**
 * Serves an override's file as another editor saved it, and tells the editor UI which of the active
 * workspace's overrides changed so it can update their tabs and reload the page. Another workspace's
 * are served as edited once it is active again.
 */
export function watchOverrideFiles(store: OverrideStore, page: PageController, send: (event: AppEvent) => void): OverrideFileWatcher {
  const watcher = new OverrideFileWatcher({
    dir: store.filesDir,
    idOf: contentFileId,
    ids: () => store.list().map((o) => o.id),
    take: (id) => store.takeFileEdit(id),
    onEdited: (ids) => {
      const shown = new Set(store.list().map((o) => o.id));
      const overrideIds = ids.filter((id) => shown.has(id));
      // Only the content changed: the Fetch patterns stay.
      if (overrideIds.length) void page.overridesChanged(false).then(() => send({ type: 'overrides-edited', overrideIds }));
    },
  });
  watcher.start();
  return watcher;
}
