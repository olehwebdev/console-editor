import { useTabStore } from '@/entities/editor-tab';

export function closeDiff(): void {
  useTabStore.getState().setDiff('off');
}
