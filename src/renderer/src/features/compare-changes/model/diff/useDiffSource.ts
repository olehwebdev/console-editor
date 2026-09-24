import { create } from 'zustand';
import type { monaco } from '@/shared/monaco';
import { useTabStore } from '@/entities/editor-tab';
import { diffRequest } from './diffRequest';

/** The left side of the diff. Owned here and disposed when the diff closes. */
interface DiffSource {
  original: monaco.editor.ITextModel | null;
  label: string;
}

export const useDiffSource = create<DiffSource>()(() => ({ original: null, label: '' }));

// Switching tabs or closing the diff resets the store's diff mode; free the left model then.
useTabStore.subscribe((state, prev) => {
  if (state.activeId !== prev.activeId) diffRequest.generation++;
  if (state.diff === 'off' && prev.diff !== 'off') {
    diffRequest.generation++;
    const { original } = useDiffSource.getState();
    useDiffSource.setState({ original: null, label: '' });
    // After React has swapped the diff editor out.
    setTimeout(() => original?.dispose(), 0);
  }
});
