import { CDP } from '../../../engine/constants';
import { withTimeout } from '../../../engine/PageInterception';
import { atViewport, captureOverCdp, type CapturedImage, type Viewport } from '../../../shots/capture';
import { LOADED_EXPRESSION } from '../../../shots/constants';
import { LOAD_TIMEOUT_MS } from '../constants';
import type { DrivenTabState } from './types';

/** Captures the whole page a tab shows, laid out in `viewport`, once it has loaded and been quiet a moment. */
export async function captureTabAt(tab: DrivenTabState, viewport: Viewport): Promise<CapturedImage> {
  // A page still loading after that is captured as it is.
  await withTimeout(tab.transport.send(CDP.Runtime.evaluate, { expression: LOADED_EXPRESSION, awaitPromise: true }), LOAD_TIMEOUT_MS, 'Loading the page').catch(() => undefined);
  return atViewport(tab.transport, viewport, () => captureOverCdp(tab.transport, { area: 'page' }));
}
