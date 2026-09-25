import type { ViewRef } from '@/shared/lib';
import type { monaco } from '@/shared/monaco';
import { VIEW_KEY_SEPARATOR } from './constants';

/** Names this version of a tab's text for the worker, which lines up each version once. */
export function viewOf(tabId: string, model: monaco.editor.ITextModel): ViewRef {
  return { key: [tabId, model.id, model.getAlternativeVersionId()].join(VIEW_KEY_SEPARATOR) };
}
