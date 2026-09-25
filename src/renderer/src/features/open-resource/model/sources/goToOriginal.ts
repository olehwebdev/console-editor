import { fileName } from '@/shared/lib';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { isMappableKind } from '@/entities/source-map';
import { askLoadedMap } from './askLoadedMap';
import { bundleUrlOf } from './bundleUrlOf';
import { cursorOf } from './cursorOf';
import { editCause } from './editCause';
import { isMiss } from './isMiss';
import { jumpState } from './jumpState';
import { noteMismatch } from './noteMismatch';
import { openOriginalSource } from './openOriginalSource';
import { readySourceMap } from './readySourceMap';
import { toastMiss } from './toastMiss';
import { viewOf } from './viewOf';

/**
 * From the cursor in a script or stylesheet tab (pretty-printed or not, even an override) to the
 * original code it was built from, opened read-only at that line.
 */
export async function goToOriginal(tabId = useTabStore.getState().activeId): Promise<void> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab || !isMappableKind(tab.kind) || jumpState.running) return;
  jumpState.running = true;
  try {
    const kind = tab.kind;
    const bundleUrl = bundleUrlOf(tab);
    const bundle = fileName(bundleUrl);
    if (!(await readySourceMap(bundleUrl, kind))) return;
    const model = getTabModel(tab.id);
    if (!model || model.isDisposed()) return;
    const reply = await askLoadedMap({ type: 'toOriginal', bundleUrl, view: viewOf(tab.id, model), offset: model.getOffsetAt(cursorOf(model)) }, { kind, model });
    if (isMiss(reply)) return toastMiss(reply.miss, { bundle, cause: editCause(tab) });
    noteMismatch(bundleUrl, kind, reply.mismatch);
    await openOriginalSource(bundleUrl, kind, reply.url, { reveal: { lineNumber: reply.line, column: reply.column } });
  } finally {
    jumpState.running = false;
  }
}
