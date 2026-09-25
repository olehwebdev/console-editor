import { fileName } from '@/shared/lib';
import { requestReveal } from '@/shared/monaco';
import { toast } from '@/shared/ui/toast';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { parseSourceUrl } from '@/entities/source-map';
import { openResource } from '../open/openResource';
import { askLoadedMap } from './askLoadedMap';
import { cursorOf } from './cursorOf';
import { editCause } from './editCause';
import { isMiss } from './isMiss';
import { jumpState } from './jumpState';
import { MISS_TEXT } from './missText';
import { noteMismatch } from './noteMismatch';
import { readySourceMap } from './readySourceMap';
import { toastMiss } from './toastMiss';
import { viewOf } from './viewOf';

/**
 * From a line of an original to the bundle code it became, in the bundle's tab (opened as usual:
 * pretty-printed, or the override that applies). The cursor's line is used unless `line` is given.
 */
export async function goToBundle(tabId = useTabStore.getState().activeId, line?: number): Promise<void> {
  const source = useTabStore.getState().sources.find((t) => t.id === tabId);
  if (!source || jumpState.running) return;
  jumpState.running = true;
  try {
    const { bundleUrl, bundleKind: kind } = source;
    const sourceModel = getTabModel(source.id);
    const wanted = line ?? (sourceModel ? cursorOf(sourceModel).lineNumber : 1);
    const context = { bundle: fileName(bundleUrl), file: parseSourceUrl(source.url).file, line: wanted };
    if (!(await readySourceMap(bundleUrl, kind))) return;
    const target = await askLoadedMap({ type: 'toBundle', bundleUrl, url: source.url, line: wanted }, { kind });
    if (isMiss(target)) return toastMiss(target.miss, context);
    noteMismatch(bundleUrl, kind, target.mismatch);
    const bundleTabId = await openResource(bundleUrl, { activate: false });
    const bundleTab = useTabStore.getState().tabs.find((t) => t.id === bundleTabId);
    const model = bundleTabId ? getTabModel(bundleTabId) : undefined;
    if (!bundleTab || !model || model.isDisposed()) return;
    const landed = await askLoadedMap({ type: 'toView', bundleUrl, view: viewOf(bundleTab.id, model), rawOffset: target.rawOffset }, { kind, model });
    if (isMiss(landed)) return toastMiss(landed.miss, context);
    // The saved scroll position of the tab would otherwise win: the reveal goes first, then the switch.
    requestReveal(model, model.getPositionAt(landed.offset));
    useTabStore.getState().activate(bundleTab.id);
    if (landed.fit === 'edited') {
      const cause = editCause(bundleTab);
      toast(cause === 'yours' ? { title: `You've edited this part of ${context.bundle}`, description: 'The exact line is inside your changes: showing where they start.', tone: 'warning' } : MISS_TEXT.edited({ ...context, cause }));
    } else if (target.line !== wanted) {
      toast({ title: `Line ${wanted} of ${context.file} has no code in the bundle`, description: `Showing line ${target.line}'s.`, tone: 'neutral' });
    }
  } finally {
    jumpState.running = false;
  }
}
