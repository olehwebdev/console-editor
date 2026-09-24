import { create } from 'zustand';
import type { AppInfo, UpdateState } from '@common/types';

interface UpdateStore {
  /** Mirrors the main process's updater. */
  state: UpdateState;
  /** The running version (and the previous one, right after an update). */
  info: AppInfo | null;
  setState(state: UpdateState): void;
  setInfo(info: AppInfo): void;
}

export const useUpdateStore = create<UpdateStore>()((set) => ({
  state: { status: 'idle' },
  info: null,
  setState: (state) => set({ state }),
  setInfo: (info) => set({ info }),
}));

/** The release on offer, while there is one (also after its download failed, to try again). */
export const selectOfferedUpdate = (s: UpdateStore) => {
  const { state } = s;
  if (state.status === 'available' || state.status === 'downloading' || state.status === 'ready') return state.update;
  return state.status === 'error' ? (state.update ?? null) : null;
};
