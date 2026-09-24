import { languageFor, monaco } from '@/shared/monaco';
import type { TabMeta } from '@/entities/editor-tab';
import { useDiffSource } from './useDiffSource';

export function setOriginal(text: string, tab: TabMeta, label: string): void {
  const previous = useDiffSource.getState().original;
  useDiffSource.setState({ original: monaco.editor.createModel(text, languageFor(tab.kind, text.length)), label });
  // After React has attached the new model: the diff editor errors if a model it shows is disposed.
  if (previous) setTimeout(() => previous.dispose(), 0);
}
