import { create } from 'zustand';
import type { UpdateStore } from './types';

export const useUpdateStore = create<UpdateStore>()((set) => ({
  state: { status: 'idle' },
  info: null,
  setState: (state) => set({ state }),
  setInfo: (info) => set({ info }),
}));
