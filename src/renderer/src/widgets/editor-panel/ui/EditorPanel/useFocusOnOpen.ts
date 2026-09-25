import { useEffect } from 'react';
import { requestEditorFocus } from '@/shared/monaco';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { useResponseViews } from '@/features/network/response-tree';
import { openedTabId } from '../../lib/openedTabId';

/** Opening or switching to a tab asks the editor to take focus; closing one doesn't, nor one showing its response as a tree (which takes focus itself). */
export function useFocusOnOpen() {
  useEffect(
    () =>
      useTabStore.subscribe((state, prev) => {
        const opened = openedTabId(state, prev);
        if (opened && !useResponseViews.getState().tree[opened]) requestEditorFocus(getTabModel(opened));
      }),
    [],
  );
}
