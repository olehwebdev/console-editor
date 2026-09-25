import { create } from 'zustand';
import type { PageState } from '@common/types';
import type { PageStore } from './types';

const EMPTY: PageState = { url: '', title: '', loading: false, canGoBack: false, canGoForward: false, detached: false };

/** State of the website shown in the preview (mirrors the main process). */
export const usePageStore = create<PageStore>()((set) => ({
  page: EMPTY,
  setPage: (page) => set({ page }),
}));
