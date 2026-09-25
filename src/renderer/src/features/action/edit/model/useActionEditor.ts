import { create } from 'zustand';
import { BLANK_ACTION } from './constants';
import type { ActionEditorStore } from './types';

/** The action form: closed, or open on a new action or one of the list. */
export const useActionEditor = create<ActionEditorStore>()((set) => ({
  editing: null,
  startNew: (start = {}) => set((s) => ({ editing: { id: null, start: { ...BLANK_ACTION, ...start }, session: (s.editing?.session ?? 0) + 1 } })),
  startEdit: ({ id, name, target, targetName, code }) =>
    set((s) => ({ editing: { id, start: { name, target, targetName, code }, session: (s.editing?.session ?? 0) + 1 } })),
  close: () => set((s) => (s.editing ? { editing: null } : s)),
}));
