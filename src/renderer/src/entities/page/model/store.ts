import { create } from 'zustand';
import type { PageState } from '@common/types';

const EMPTY: PageState = { url: '', title: '', loading: false, canGoBack: false, canGoForward: false };

interface PageStore {
  page: PageState;
  setPage(page: PageState): void;
}

/** State of the website shown in the preview (mirrors the main process). */
export const usePageStore = create<PageStore>()((set) => ({
  page: EMPTY,
  setPage: (page) => set({ page }),
}));

export const selectHasPage = (s: PageStore) => s.page.url !== '';
