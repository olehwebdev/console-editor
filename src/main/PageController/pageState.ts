import type { WebContents } from 'electron';
import type { PageState } from '../../shared/types';
import { BLANK_PAGE } from './constants';

/** What the toolbar shows of the page; the blank page shows as none. `detached`: it has a window of its own. */
export function pageState(wc: WebContents, detached: boolean): PageState {
  const url = wc.getURL();
  return {
    url: url === BLANK_PAGE ? '' : url,
    title: url === BLANK_PAGE ? '' : wc.getTitle(),
    loading: wc.isLoading(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward(),
    detached,
  };
}
