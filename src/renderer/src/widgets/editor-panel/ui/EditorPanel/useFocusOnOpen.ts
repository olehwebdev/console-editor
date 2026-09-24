import { useEffect } from 'react';
import { requestEditorFocus } from '@/shared/monaco';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { openedTabId } from '../../lib/openedTabId';

/** Opening or switching to a tab asks the editor to take focus; closing one doesn't. */
export function useFocusOnOpen() {
  useEffect(
    () =>
      useTabStore.subscribe((state, prev) => {
        const opened = openedTabId(state, prev);
        if (opened) requestEditorFocus(getTabModel(opened));
      }),
    [],
  );
}
