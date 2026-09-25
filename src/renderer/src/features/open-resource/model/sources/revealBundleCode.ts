import type { CodeLocation } from '@common/types';
import { fileName } from '@/shared/lib';
import { requestReveal } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { openResource } from '../open/openResource';
import { askLoadedMap } from './askLoadedMap';
import { SCRIPT_KIND } from './constants';
import { isMiss } from './isMiss';
import { viewOf } from './viewOf';

/**
 * Opens the script a function is defined in (pretty-printed, or the override that applies) at that function.
 * With its source map loaded (`rawOffset`), the place is lined up through pretty-printing; without one, the
 * tab opens and a toast says where it is in the file as served.
 */
export async function revealBundleCode(location: CodeLocation, rawOffset: number | null): Promise<void> {
  const tabId = await openResource(location.url, { activate: false });
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  const model = tabId ? getTabModel(tabId) : undefined;
  if (!tab || !model || model.isDisposed()) return;
  if (rawOffset !== null) {
    const landed = await askLoadedMap({ type: 'toView', bundleUrl: location.url, view: viewOf(tab.id, model), rawOffset }, { kind: SCRIPT_KIND, model });
    // The saved scroll position of the tab would otherwise win: the reveal goes first, then the switch.
    if (!isMiss(landed)) requestReveal(model, model.getPositionAt(landed.offset));
    useTabStore.getState().activate(tab.id);
    return;
  }
  useTabStore.getState().activate(tab.id);
  toast({
    title: `Line ${location.line + 1}, column ${location.column + 1} of ${fileName(location.url)} as served`,
    description: 'It has no source map, so the place in the pretty-printed file is not known.',
    tone: 'neutral',
  });
}
