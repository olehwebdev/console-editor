import type { PageStore } from './types';

export const selectHasPage = (s: PageStore) => s.page.url !== '';
