import type { monaco } from '@/shared/monaco';
import { getTabModel, useTabStore } from '@/entities/editor-tab';
import { isMappableKind } from '@/entities/source-map';

/** Whether a model is a script or stylesheet tab's: one that can jump to its original code. */
export function isBundleModel(model: monaco.editor.ITextModel | null): boolean {
  return !!model && useTabStore.getState().tabs.some((tab) => isMappableKind(tab.kind) && getTabModel(tab.id) === model);
}
