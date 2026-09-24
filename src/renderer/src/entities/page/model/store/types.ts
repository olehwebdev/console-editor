import type { PageState } from '@common/types';

export interface PageStore {
  page: PageState;
  setPage(page: PageState): void;
}
