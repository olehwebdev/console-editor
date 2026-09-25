import { useCallback, useSyncExternalStore } from 'react';
import { onTabEdited } from '@/entities/editor-tab';
import { readTabJson } from './readTabJson';
import type { TabJson } from './types';

/** A tab's text read as JSON, again after every edit (in the tree or in the text). */
export function useTabJson(tabId: string): TabJson {
  const subscribe = useCallback((changed: () => void) => onTabEdited((id) => id === tabId && changed()), [tabId]);
  return useSyncExternalStore(subscribe, () => readTabJson(tabId));
}
