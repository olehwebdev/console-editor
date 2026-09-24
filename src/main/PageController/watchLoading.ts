import type { WebContents } from 'electron';
import type { AppEvent } from '../../shared/types';

/** Chromium's net error for a navigation replaced by another one, not a real failure. */
const ERR_ABORTED = -3;

/** Runs `stateChanged` whenever what `pageState` reports may have changed, and reports a page that fails to load. */
export function watchLoading(wc: WebContents, stateChanged: () => void, send: (event: AppEvent) => void): void {
  wc.on('did-start-loading', stateChanged);
  wc.on('did-stop-loading', stateChanged);
  wc.on('did-navigate', stateChanged);
  wc.on('did-navigate-in-page', stateChanged);
  wc.on('page-title-updated', stateChanged);
  wc.on('did-fail-load', (_e, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== ERR_ABORTED) send({ type: 'error', message: `Failed to load ${url}: ${description} (${code})` });
  });
}
